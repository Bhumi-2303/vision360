export const knownTypes = new Set(['building', 'department', 'classroom', 'lab']);
export const typeIcons  = { building: '🏫', department: '🏛️', classroom: '🚪', lab: '🔬' };
export const typeLabels = { building: 'Main Campus', department: 'Department', classroom: 'Classroom', lab: 'Lab' };
export const typeBgColors = {
    building:   { icon: 'rgba(0,242,254,0.15)',   border: 'rgba(0,242,254,0.25)',   text: 'var(--c-primary)' },
    department: { icon: 'rgba(79,172,254,0.15)',  border: 'rgba(79,172,254,0.25)',  text: 'var(--c-secondary)' },
    classroom:  { icon: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.25)', text: '#a78bfa' },
    lab:        { icon: 'rgba(240,147,251,0.15)', border: 'rgba(240,147,251,0.25)', text: '#f093fb' },
};

export function inferType(s) {
    const raw = (s.sceneType || '').toLowerCase().trim();
    if (knownTypes.has(raw)) return raw;
    const t = (s.title || '').toLowerCase();
    if (t.includes('campus') || t.includes('main')) return 'building';
    if (t.includes('department') || t.includes('dept')) return 'department';
    if (t.includes('lab') || t.includes('laboratory')) return 'lab';
    if (t.includes('room') || t.includes('class') || t.includes('hall')) return 'classroom';
    return 'building';
}

const typeOrder = { building: 1, department: 2, classroom: 3, lab: 4 };
export function sortScenes(arr) {
    return [...arr].sort((a, b) => {
        const aO = typeOrder[a.sceneType] || 1;
        const bO = typeOrder[b.sceneType] || 1;
        return aO !== bO ? aO - bO : (a.title || '').localeCompare(b.title || '');
    });
}
