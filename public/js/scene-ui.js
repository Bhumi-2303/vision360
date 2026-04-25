import { typeIcons, typeLabels, typeBgColors } from "./scene-helpers.js";

function animateCount(el, target, duration = 1400) {
  if (!el || target === 0) { if(el) el.textContent = '0'; return; }
  let start = null;
  const step = (timestamp) => {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(ease * target);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target;
  };
  requestAnimationFrame(step);
}

// SceneUI handles the primary landing page interactive elements and stats.

export class SceneUI {
    constructor() {
        this.cardGrid      = document.getElementById("building-cards-grid");
        this.hierarchyView = document.getElementById("hierarchy-view");
        this.statScenes    = document.getElementById("stat-scenes");
        this.statLocations = document.getElementById("stat-locations");
        this.statHotspots  = document.getElementById("stat-hotspots");
        this.resultsCount  = document.getElementById("results-count");
        this.searchInput   = document.getElementById("scene-search");
        this.searchClear   = document.getElementById("search-clear-btn");
        this.suggestions   = document.getElementById("search-suggestions");
        this.btnGrid       = document.getElementById("btn-grid-view");
        this.btnTree       = document.getElementById("btn-tree-view");
        
        this.campusLoader = document.getElementById("campus-loader");
        this.emptyState   = document.getElementById("campus-empty-state");

        // Ensure clean initial state: ONLY show loader
        if (this.campusLoader) this.campusLoader.style.display = 'flex';
        if (this.emptyState)   this.emptyState.style.display = 'none';
        if (this.cardGrid)     this.cardGrid.style.display = 'none';

        this.allScenes  = [];
        this.activeMode = 'grid';
    }

    init(scenes) {
        this.allScenes = scenes;
        
        // Always hide the loading spinner once fetch is done
        if (this.campusLoader) this.campusLoader.style.display = 'none';

        if (scenes.length > 0) {
            // Data found: Show grid, hide empty state
            if (this.cardGrid) {
                this.cardGrid.style.display = 'grid';
                setTimeout(() => { this.cardGrid.style.opacity = '1'; }, 50);
            }
            if (this.emptyState) this.emptyState.style.display = 'none';
        } else {
            // Zero results: Hide grid, show empty state
            if (this.cardGrid) this.cardGrid.style.display = 'none';
            if (this.emptyState) this.emptyState.style.display = 'block';
        }

        if (this.statScenes) {
            animateCount(this.statScenes, this.allScenes.length);
        }
        if (this.statLocations) {
            // Count distinct values of the 'building' field
            const buildings = new Set(this.allScenes.map(s => s.building).filter(Boolean));
            animateCount(this.statLocations, buildings.size);
        }
        if (this.statHotspots) {
            // Sum hotspots array lengths across all scenes
            const hotspotsCount = this.allScenes.reduce((sum, s) => sum + (s.hotSpots ? s.hotSpots.length : 0), 0);
            animateCount(this.statHotspots, hotspotsCount);
        }

        // Phase 2 visual system keeps hero background clean white/glass.

        this.renderGridView(this.allScenes);
        this.buildHierarchyView(this.allScenes);
        this.updateResultsCount(this.allScenes.length);
        this.setupEventListeners();
    }

    showError(err) {
        console.error("Error loading campuses:", err);
        if (this.campusLoader) this.campusLoader.style.display = 'none';
        if (this.cardGrid) {
            this.cardGrid.style.display = 'grid';
            this.cardGrid.style.opacity = '1';
            this.cardGrid.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:80px 20px;">
                    <i class="fas fa-exclamation-triangle" style="font-size:2.5rem; color:var(--c-danger); margin-bottom:20px; display:block;"></i>
                    <p style="color:var(--c-danger);">Failed to load campuses. Please check your connection.</p>
                    <small style="color:var(--text-faint);">${err.message}</small>
                </div>`;
        }
    }

    renderGridView(scenes) {
        if (!this.cardGrid) return;
        this.cardGrid.innerHTML = '';
        
        const isSearching = this.searchInput && this.searchInput.value.trim() !== '';

        if (scenes.length === 0) {
            // Hide global empty state if searching (to show search-specific message instead)
            if (isSearching && this.emptyState) this.emptyState.style.display = 'none';
            
            if (isSearching) {
                this.cardGrid.innerHTML = `
                    <div style="grid-column:1/-1; text-align:center; padding:80px 20px;">
                        <i class="fas fa-search" style="font-size:3rem; color:var(--text-faint); margin-bottom:20px; display:block;"></i>
                        <p style="color:var(--text-muted); font-size:1.1rem;">No scenes found. Try a different search.</p>
                    </div>`;
            }
            return;
        }

        // If we have scenes, ensure empty state is hidden
        if (this.emptyState) this.emptyState.style.display = 'none';

        scenes.forEach((data, idx) => {
            const col  = typeBgColors[data.sceneType] || typeBgColors.building;
            const card = document.createElement("div");
            card.className = "campus-card";
            card.style.animationDelay = `${idx * 0.08}s`;
            const hsCount = data.hotSpots ? data.hotSpots.length : 0;
            card.innerHTML = `
                <div class="card-content">
                    <div class="card-badge" style="display:inline-flex;align-items:center;gap:6px;margin-bottom:14px;background:${col.icon};border:1px solid ${col.border};color:${col.text};">
                        ${typeIcons[data.sceneType] || '🌐'} ${typeLabels[data.sceneType] || 'Scene'}
                    </div>
                    <h3>${data.title}</h3>
                    <p>Explore this immersive 360° panoramic view and navigate through interactive hotspots.</p>
                    <div class="card-footer">
                        <button class="explore-btn" data-id="${data.id}">
                            Explore <i class="fas fa-arrow-right"></i>
                        </button>
                        <div class="card-meta">
                            <i class="fas fa-map-pin"></i>
                            ${hsCount} hotspot${hsCount !== 1 ? 's' : ''}
                        </div>
                    </div>
                </div>`;
            this.cardGrid.appendChild(card);
        });

        this.cardGrid.querySelectorAll('.explore-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const scene = this.allScenes.find(s => s.id === btn.dataset.id);
                if (scene && scene.title.toLowerCase().includes('main campus')) {
                    sessionStorage.setItem('ira_welcome', 'true');
                }
                window.location.href = `viewer.html?scene=${btn.dataset.id}`;
            });
        });
    }

    buildHierarchyView(scenes) {
        if (!this.hierarchyView) return;
        this.hierarchyView.innerHTML = '';
        const buildings   = scenes.filter(s => s.sceneType === 'building');
        const departments = scenes.filter(s => s.sceneType === 'department');
        const children    = scenes.filter(s => s.sceneType === 'classroom' || s.sceneType === 'lab');

        buildings.forEach(b => {
            const row = document.createElement('div');
            row.className = 'building-row';
            row.innerHTML = `
                <div class="building-icon">🏫</div>
                <div class="building-info">
                    <div class="building-title">${b.title}</div>
                    <div class="building-subtitle">Main Campus · ${b.hotSpots?.length || 0} hotspot${(b.hotSpots?.length||0)!==1?'s':''}</div>
                </div>
                <button class="child-explore" data-id="${b.id}">
                    <i class="fas fa-street-view"></i> <span>Explore</span>
                </button>`;
            this.hierarchyView.appendChild(row);
        });

        departments.forEach(dept => {
            const linkedViaParent   = children.filter(c => c.parentId === dept.id);
            const linkedViaHotspot  = children.filter(c => !c.parentId && (dept.hotSpots || []).some(hs => hs.sceneId === c.id));
            const deptChildren = [...new Map([...linkedViaParent, ...linkedViaHotspot].map(c => [c.id, c])).values()];
            const group = document.createElement('div');
            group.className = 'dept-group';
            const header = document.createElement('div');
            header.className = 'dept-group-header';
            header.innerHTML = `
                <div class="dept-group-icon"><i class="fas fa-university"></i></div>
                <div class="dept-group-info">
                    <strong>${dept.title}</strong>
                    <span>${deptChildren.length} room${deptChildren.length !== 1 ? 's' : ''} / lab${deptChildren.length !== 1 ? 's' : ''} inside</span>
                </div>
                <button class="child-explore" data-id="${dept.id}" style="margin-right:8px;">
                    <i class="fas fa-eye"></i> <span>View</span>
                </button>
                <i class="fas fa-chevron-down dept-chevron"></i>`;
            const childContainer = document.createElement('div');
            childContainer.className = 'dept-children';
            if (deptChildren.length === 0) {
                const empty = document.createElement('div');
                empty.style.cssText = 'padding:24px;color:var(--text-muted);font-size:0.9rem;text-align:center;background:rgba(0,0,0,0.02);';
                empty.innerHTML = '<i class="fas fa-info-circle" style="margin-right:8px;opacity:0.6;"></i>No rooms or labs linked yet.';
                childContainer.appendChild(empty);
            } else {
                deptChildren.forEach(child => {
                    const childRow = document.createElement('div');
                    childRow.className = 'child-scene-row';
                    childRow.innerHTML = `
                        <div class="child-icon ${child.sceneType}">${typeIcons[child.sceneType] || '🌐'}</div>
                        <div class="child-info">
                            <strong>${child.title}</strong>
                            <span>${typeLabels[child.sceneType]} · ${child.hotSpots?.length || 0} hotspot${(child.hotSpots?.length||0)!==1?'s':''}</span>
                        </div>
                        <button class="child-explore" data-id="${child.id}">
                            <i class="fas fa-arrow-right"></i> <span>Explore</span>
                        </button>`;
                    childContainer.appendChild(childRow);
                });
            }
            header.addEventListener('click', (e) => {
                if (e.target.closest('.child-explore')) return;
                group.classList.toggle('open');
            });
            group.appendChild(header);
            group.appendChild(childContainer);
            this.hierarchyView.appendChild(group);
        });

        const linkedIds = new Set([
            ...children.filter(c => c.parentId).map(c => c.id),
            ...departments.flatMap(d => (d.hotSpots || []).map(hs => hs.sceneId))
        ]);
        const orphans = children.filter(c => !linkedIds.has(c.id));
        if (orphans.length > 0) {
            const orphanGroup = document.createElement('div');
            orphanGroup.className = 'dept-group';
            const orphanHeader = document.createElement('div');
            orphanHeader.className = 'dept-group-header';
            orphanHeader.innerHTML = `
                <div class="dept-group-icon" style="background:linear-gradient(135deg,#667eea,#764ba2);">
                    <i class="fas fa-layer-group"></i>
                </div>
                <div class="dept-group-info">
                    <strong>Other Spaces</strong>
                    <span>Rooms &amp; Labs not yet linked to a department</span>
                </div>
                <i class="fas fa-chevron-down dept-chevron"></i>`;
            const orphanContainer = document.createElement('div');
            orphanContainer.className = 'dept-children';
            orphans.forEach(child => {
                const childRow = document.createElement('div');
                childRow.className = 'child-scene-row';
                childRow.innerHTML = `
                    <div class="child-icon ${child.sceneType}">${typeIcons[child.sceneType] || '🌐'}</div>
                    <div class="child-info">
                        <strong>${child.title}</strong>
                        <span>${typeLabels[child.sceneType]} · ${child.hotSpots?.length || 0} hotspots</span>
                    </div>
                    <button class="child-explore" data-id="${child.id}">
                        <i class="fas fa-arrow-right"></i> <span>Explore</span>
                    </button>`;
                orphanContainer.appendChild(childRow);
            });
            orphanHeader.addEventListener('click', () => orphanGroup.classList.toggle('open'));
            orphanGroup.appendChild(orphanHeader);
            orphanGroup.appendChild(orphanContainer);
            this.hierarchyView.appendChild(orphanGroup);
        }

        this.hierarchyView.querySelectorAll('.child-explore').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const scene = this.allScenes.find(s => s.id === btn.dataset.id);
                if (scene && scene.title.toLowerCase().includes('main campus')) {
                    sessionStorage.setItem('ira_welcome', 'true');
                }
                window.location.href = `viewer.html?scene=${btn.dataset.id}`;
            });
        });
    }

    setViewMode(mode) {
        this.activeMode = mode;
        if (mode === 'grid') {
            if (this.cardGrid)      this.cardGrid.style.display = '';
            if (this.hierarchyView) this.hierarchyView.classList.remove('active');
            if (this.btnGrid)       this.btnGrid.classList.add('active');
            if (this.btnTree)       this.btnTree.classList.remove('active');
        } else {
            if (this.cardGrid)      this.cardGrid.style.display = 'none';
            if (this.hierarchyView) this.hierarchyView.classList.add('active');
            if (this.btnGrid)       this.btnGrid.classList.remove('active');
            if (this.btnTree)       this.btnTree.classList.add('active');
        }
    }

    updateResultsCount(n, q = '') {
        if (!this.resultsCount) return;
        this.resultsCount.innerHTML = q
            ? `<strong>${n}</strong> result${n !== 1 ? 's' : ''} for "<strong>${q}</strong>"`
            : `<strong>${n}</strong> scene${n !== 1 ? 's' : ''} available`;
    }

    highlight(text, q) {
        const idx = text.toLowerCase().indexOf(q);
        if (idx === -1) return text;
        return text.slice(0, idx) +
            `<mark style="background:rgba(0,242,254,0.2);color:var(--c-primary);border-radius:3px;padding:0 2px;">${text.slice(idx, idx + q.length)}</mark>` +
            text.slice(idx + q.length);
    }

    renderSuggestions(query) {
        if (!this.suggestions) return;
        if (!query) { this.suggestions.classList.remove('open'); return; }
        const q    = query.toLowerCase();
        const hits = this.allScenes.filter(s => (s.title || '').toLowerCase().includes(q)).slice(0, 6);

        if (hits.length === 0) {
            this.suggestions.innerHTML = `<div class="no-results"><i class="fas fa-search" style="margin-right:6px;"></i>No scenes match "<strong>${query}</strong>"</div>`;
        } else {
            this.suggestions.innerHTML = hits.map(s => {
                const col = typeBgColors[s.sceneType] || typeBgColors.building;
                return `
                    <div class="suggestion-item" data-id="${s.id}">
                        <div class="suggestion-icon" style="background:${col.icon};border:1px solid ${col.border};color:${col.text};">
                            ${typeIcons[s.sceneType] || '🌐'}
                        </div>
                        <div class="suggestion-info">
                            <strong>${this.highlight(s.title, q)}</strong>
                            <span>${typeLabels[s.sceneType] || 'Scene'} · ${s.hotSpots?.length || 0} hotspot${(s.hotSpots?.length||0)!==1?'s':''}</span>
                        </div>
                        <i class="fas fa-arrow-right" style="color:var(--text-faint);font-size:0.8rem;"></i>
                    </div>`;
            }).join('');
        }
        this.suggestions.classList.add('open');
    }

    filterAndRender(query) {
        const q = (query || '').toLowerCase().trim();
        const filtered = q
            ? this.allScenes.filter(s =>
                (s.title || '').toLowerCase().includes(q) ||
                (typeLabels[s.sceneType] || '').toLowerCase().includes(q))
            : this.allScenes;
        this.renderGridView(filtered);
        this.buildHierarchyView(filtered);
        this.updateResultsCount(filtered.length, q);
        if (this.searchClear) this.searchClear.className = q ? 'search-clear visible' : 'search-clear';
    }

    setupEventListeners() {
        if (this.btnGrid) this.btnGrid.addEventListener('click', () => this.setViewMode('grid'));
        if (this.btnTree) this.btnTree.addEventListener('click', () => this.setViewMode('tree'));

        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                this.renderSuggestions(e.target.value);
                this.filterAndRender(e.target.value);
            });
            this.searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.searchInput.value = '';
                    if (this.suggestions) this.suggestions.classList.remove('open');
                    this.filterAndRender('');
                }
            });
        }

        if (this.searchClear) {
            this.searchClear.addEventListener('click', () => {
                if (this.searchInput) this.searchInput.value = '';
                if (this.suggestions) this.suggestions.classList.remove('open');
                this.filterAndRender('');
                if (this.searchInput) this.searchInput.focus();
            });
        }

        if (this.suggestions) {
            this.suggestions.addEventListener('click', (e) => {
                const item = e.target.closest('.suggestion-item');
                if (item) window.location.href = `viewer.html?scene=${item.dataset.id}`;
            });
        }

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-wrap') && this.suggestions) {
                this.suggestions.classList.remove('open');
            }
        });
    }
    }
}
