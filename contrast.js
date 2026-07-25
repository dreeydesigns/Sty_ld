function getLuminance(hex) {
    const rgb = hex.match(/\w\w/g).map(x => parseInt(x, 16) / 255);
    const a = rgb.map(v => {
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrast(hex1, hex2) {
    const l1 = getLuminance(hex1) + 0.05;
    const l2 = getLuminance(hex2) + 0.05;
    return l1 > l2 ? l1 / l2 : l2 / l1;
}

const colors = {
    rose: '#ec486a',
    gold: '#b38b36',
    plum: '#c26fb0',
    mauve: '#a38896',
    orchid: '#d94ce8',
    teal: '#2db39d',
    purple: '#9370eb',
    orange: '#e67320',
    blush: '#e38bb6',
    charcoal: '#d8cce8',
    navy: '#eae0f5'
};

const bg = '#12091a';
const white = '#ffffff';

for (const [name, hex] of Object.entries(colors)) {
    const onDark = getContrast(hex, bg).toFixed(2);
    const onWhite = getContrast(hex, white).toFixed(2);
    console.log(`${name} (${hex}): on dark=${onDark}:1, on white=${onWhite}:1`);
}
