import pool from '../db/connection.js';
import logger from '../utils/logger.js';
import * as inventoryService from './inventoryService.js';
import { generateProfessionOptions } from './aiService.js';

const DEFAULT_STATE = {
  active: null,
  history: [],
  carryOver: true,
  pendingChoices: [],
  lastOfferedTurn: null,
};

function normalizeState(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_STATE };
  }

  return {
    active: raw.active ?? null,
    history: Array.isArray(raw.history) ? raw.history : [],
    carryOver: raw.carryOver !== undefined ? !!raw.carryOver : true,
    pendingChoices: Array.isArray(raw.pendingChoices) ? raw.pendingChoices : [],
    lastOfferedTurn: raw.lastOfferedTurn ?? null,
  };
}

export async function getProfessionState(userId) {
  const result = await pool.query('SELECT profession_json FROM users WHERE id = $1', [userId]);
  const raw = result.rows[0]?.profession_json;
  const state = normalizeState(raw);
  return state;
}

async function saveProfessionState(userId, state) {
  await pool.query('UPDATE users SET profession_json = $2 WHERE id = $1', [userId, JSON.stringify(state)]);
  return state;
}

export async function setProfessionState(userId, updater) {
  const current = await getProfessionState(userId);
  const next = typeof updater === 'function' ? normalizeState(await updater(current)) : normalizeState(updater);
  return saveProfessionState(userId, next);
}

export async function setCarryOver(userId, carry) {
  return setProfessionState(userId, (prev) => ({
    ...prev,
    carryOver: !!carry,
  }));
}

export async function clearActiveProfession(userId, recordHistory = true) {
  return setProfessionState(userId, (prev) => {
    const history = Array.isArray(prev.history) ? [...prev.history] : [];
    if (prev.active && recordHistory) {
      history.push({ ...prev.active, revokedAt: new Date().toISOString() });
    }
    return {
      ...prev,
      active: null,
      history,
    };
  });
}

export async function selectProfession(userId, profession) {
  if (!profession || !profession.name) {
    throw new Error('Invalid profession payload');
  }

  return setProfessionState(userId, (prev) => {
    const chosen = {
      ...profession,
      chosenAt: new Date().toISOString(),
    };

    const history = Array.isArray(prev.history) ? [...prev.history] : [];
    if (prev.active) {
      history.push({ ...prev.active, supersededAt: new Date().toISOString() });
    }

    return {
      ...prev,
      active: chosen,
      pendingChoices: [],
      history,
    };
  });
}

export async function storeProfessionChoices(userId, choices, offeredTurn = null) {
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error('Profession choices cannot be empty');
  }

  return setProfessionState(userId, (prev) => ({
    ...prev,
    pendingChoices: choices,
    lastOfferedTurn: offeredTurn ?? prev.lastOfferedTurn,
  }));
}

export async function getProfessionChoices(userId) {
  const state = await getProfessionState(userId);
  return state.pendingChoices || [];
}

export async function regenerateProfessionChoices(userId) {
  const context = await buildProfessionContext(userId);
  const choices = await generateProfessionOptions(context);
  await storeProfessionChoices(userId, choices, context.turn ?? null);
  return choices;
}

export async function onTurnEnd(userId, turn) {
  try {
    const state = await getProfessionState(userId);

    // 仅在没有职业且未提供选择时生成首次职业选项
    const hasActive = !!state.active;
    const hasOffered = Array.isArray(state.pendingChoices) && state.pendingChoices.length > 0;
    const hasHistory = Array.isArray(state.history) && state.history.length > 0;

    if (!hasActive && !hasOffered && !hasHistory && turn >= 1) {
      const context = await buildProfessionContext(userId);
      const choices = await generateProfessionOptions(context);
      await storeProfessionChoices(userId, choices, turn);

      logger.info({ userId, turn }, 'Generated profession choices');
      return choices;
    }
  } catch (err) {
    logger.error({ err, userId, turn }, 'Failed to handle profession on turn end');
  }

  return null;
}

async function buildProfessionContext(userId) {
  const [inventory, entitySnapshot, resourcesSnapshot] = await Promise.all([
    inventoryService.getInventory(userId),
    getEntitySnapshot(userId),
    getResourceSnapshot(userId),
  ]);

  const itemNames = [];
  const itemDetails = [];

  if (inventory?.items) {
    Object.values(inventory.items).forEach((item) => {
      itemNames.push(item.name);
      itemDetails.push({ name: item.name, tier: item.tier, attrs: item.attrs_json });
    });
  }

  const entityNames = entitySnapshot.map((entity) => entity.name);

  return {
    items: itemDetails,
    itemNames,
    entities: entitySnapshot,
    entityNames,
    turn: resourcesSnapshot?.turn ?? null,
  };
}

async function getEntitySnapshot(userId) {
  const result = await pool.query(
    `SELECT COALESCE(c.name, e.kind) AS name, e.kind, e.attrs_json
     FROM entities e
     LEFT JOIN cards c ON e.card_id = c.id
     WHERE e.user_id = $1`,
    [userId]
  );

  return result.rows.map((row) => ({
    name: row.name,
    kind: row.kind,
    attrs: row.attrs_json,
  }));
}

async function getResourceSnapshot(userId) {
  const result = await pool.query('SELECT turn, food, production, research FROM resources WHERE user_id = $1', [userId]);
  return result.rows[0] || null;
}

export async function getProfessionContext(userId) {
  const [state, context] = await Promise.all([
    getProfessionState(userId),
    buildProfessionContext(userId),
  ]);

  return { state, context };
}








