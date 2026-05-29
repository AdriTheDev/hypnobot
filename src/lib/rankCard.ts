import { createCanvas, loadImage } from '@napi-rs/canvas';

interface RankCardOptions {
	username: string;
	avatarUrl: string;
	level: number;
	rank: number;
	xp: number;
	xpNeeded: number;
	color: string;
}

export async function generateRankCard(opts: RankCardOptions): Promise<Buffer> {
	const W = 800,
		H = 200;
	const canvas = createCanvas(W, H);
	const ctx = canvas.getContext('2d');

	ctx.fillStyle = '#1a1a2e';
	ctx.roundRect(0, 0, W, H, 20);
	ctx.fill();

	const avatarSize = 130;
	const avatarX = 35;
	const avatarY = (H - avatarSize) / 2;
	const cx = avatarX + avatarSize / 2;
	const cy = avatarY + avatarSize / 2;
	const r = avatarSize / 2;

	ctx.save();
	ctx.beginPath();
	ctx.arc(cx, cy, r, 0, Math.PI * 2);
	ctx.clip();

	try {
		const url = opts.avatarUrl.replace(/\.(webp|gif)(\?|$)/, '.png$2') + (opts.avatarUrl.includes('?') ? '&size=128' : '?size=128');
		const avatar = await loadImage(url);
		ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
	} catch {
		ctx.fillStyle = opts.color;
		ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
		ctx.fillStyle = '#ffffff';
		ctx.font = `bold 48px Arial`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(opts.username[0]?.toUpperCase() ?? '?', cx, cy);
		ctx.textAlign = 'left';
		ctx.textBaseline = 'alphabetic';
	}
	ctx.restore();

	ctx.strokeStyle = opts.color;
	ctx.lineWidth = 4;
	ctx.beginPath();
	ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
	ctx.stroke();

	const textX = avatarX + avatarSize + 30;
	const badgeY = 30;
	const badgeH = 28;

	const rankLabel = `RANK #${opts.rank}`;
	ctx.font = 'bold 13px Arial';
	const rankW = ctx.measureText(rankLabel).width + 24;
	ctx.fillStyle = 'rgba(255,255,255,0.1)';
	ctx.roundRect(textX, badgeY, rankW, badgeH, 6);
	ctx.fill();
	ctx.fillStyle = opts.color;
	ctx.font = 'bold 13px Arial';
	ctx.fillText(rankLabel, textX + 12, badgeY + 19);

	const levelLabel = `LEVEL ${opts.level}`;
	const levelW = ctx.measureText(levelLabel).width + 24;
	ctx.fillStyle = 'rgba(255,255,255,0.1)';
	ctx.roundRect(textX + rankW + 10, badgeY, levelW, badgeH, 6);
	ctx.fill();
	ctx.fillStyle = '#ffffff';
	ctx.fillText(levelLabel, textX + rankW + 22, badgeY + 19);

	ctx.fillStyle = '#ffffff';
	ctx.font = 'bold 26px Arial';
	ctx.fillText(opts.username, textX, 100);

	const progress = Math.min(opts.xp / opts.xpNeeded, 1);
	const xpText = `${opts.xp.toLocaleString()} / ${opts.xpNeeded.toLocaleString()} XP`;
	ctx.fillStyle = 'rgba(255,255,255,0.45)';
	ctx.font = '13px Arial';
	const xpMetrics = ctx.measureText(xpText);
	ctx.fillText(xpText, W - xpMetrics.width - 25, 100);

	const barX = textX;
	const barY = 120;
	const barW = W - textX - 25;
	const barH = 16;
	const barR = barH / 2;

	ctx.fillStyle = 'rgba(255,255,255,0.08)';
	ctx.beginPath();
	ctx.roundRect(barX, barY, barW, barH, barR);
	ctx.fill();

	if (progress > 0) {
		const fillW = Math.max(barW * progress, barH);
		const grad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
		grad.addColorStop(0, opts.color);
		grad.addColorStop(1, opts.color + 'bb');
		ctx.fillStyle = grad;
		ctx.beginPath();
		ctx.roundRect(barX, barY, fillW, barH, barR);
		ctx.fill();

		ctx.save();
		ctx.shadowColor = opts.color;
		ctx.shadowBlur = 12;
		ctx.fillStyle = 'rgba(0,0,0,0)';
		ctx.beginPath();
		ctx.roundRect(barX, barY, fillW, barH, barR);
		ctx.fill();
		ctx.restore();
	}

	ctx.fillStyle = 'rgba(255,255,255,0.3)';
	ctx.font = '11px Arial';
	ctx.fillText(`${Math.floor(progress * 100)}% to next level`, barX, barY + barH + 16);

	return canvas.toBuffer('image/png');
}
