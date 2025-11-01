import OpenAI from "openai";

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.error("请先设置环境变量 OPENROUTER_API_KEY");
  process.exit(1);
}

const baseURL = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

const client = new OpenAI({
  apiKey,
  baseURL,
});

async function main() {
  try {
    const completion = await client.chat.completions.create({
      model: "google/gemini-2.5-flash-preview-09-2025",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "What is in this image?" },
            {
              type: "image_url",
              image_url: {
                url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg",
              },
            },
          ],
        },
      ],
    });

    const message = completion.choices[0]?.message?.content;
    if (!message) {
      console.error("没有返回消息内容");
      process.exit(1);
    }
    console.log(message);
  } catch (error) {
    console.error("调用 OpenRouter 失败", error);
    process.exitCode = 1;
  }
}

main();

