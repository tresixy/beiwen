export function ForgeOverlay({ overlay }) {
    if (!overlay?.visible) {
        return null;
    }

    const { position, status, text } = overlay;
    const style = {
        left: `${position.x}%`,
        top: `${position.y}%`,
    };

    return (
        <div className={`forge-overlay ${status}`} style={style}>
            <div className="ring" />
            <div>{text}</div>
        </div>
    );
}







