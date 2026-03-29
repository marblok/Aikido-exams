// components/aikidoTableApp.js

export class AikidoTableManager {
    constructor(config) {
        // Destructure config with reasonable defaults
        const {
            techniquesTable,
            examinationTechniquesTable,
            tableHtmlUrl,
            pageTitle = "Aikido Techniques Table",
            attackListTitle = "Videos",
            noteHtml = "",
            examTableId = "examRequirementsTable",
            mainTableContainerId = "mainContainer",
        } = config;
        this.currentData = techniquesTable;
        this.examinationTechniquesTable = examinationTechniquesTable;
        this.filteredData = [...this.currentData];
        this.attackSearchTerm = '';
        this.techniqueSearchTerm = '';
        this.selectedKyus = [1, 2, 3, 4, 5, 6, -1];
        this.compactView = false;
        this.hideEmpty = true;
        this.tableHtmlUrl = tableHtmlUrl;
        this.pageTitle = pageTitle;
        this.attackListTitle = attackListTitle;
        this.noteHtml = noteHtml;
        this.examTableId = examTableId;
        this.mainTableContainerId = mainTableContainerId;
        this.tableReady = false;
        this.noTooltipValue = '__no_tooltip__';
        this.storageKeys = {
            selectedTooltips: 'selectedTooltips',
            tooltipValues: 'tooltipValues',
            selectedTag: 'selectedTag',
            selectedKyus: 'selectedKyus',
            stickyFirstCol: 'stickyFirstCol',
            compactView: 'compactView',
            hideEmpty: 'hideEmpty',
            showExamRequirements: 'showExamRequirements',
            limitTableHeight: 'limitTableHeight',
            videoTags: 'videoTags',
            showTags: 'showTags'
        };
        this.tagOptions = [
            { value: 'all', label: 'All' },
            { value: 'ok', label: '✔️ ok' },
            { value: 'not-ok', label: '❌ not ok' },
            { value: 'favorite', label: '⭐ favorite' }
        ];
        this.videoTags = this.loadTagsFromStorage();

        // Load and insert table HTML, then continue
        fetch(this.tableHtmlUrl)
            .then(res => res.text())
            .then(html => {
                // Insert table HTML
                document.getElementById(this.mainTableContainerId).innerHTML = html;
                // Adjust titles and notes if desired
                if (document.getElementById("pageTitle")) {
                    document.getElementById("pageTitle").innerText = this.pageTitle;
                }
                if (document.getElementById("attackListTitle")) {
                    document.getElementById("attackListTitle").innerText = this.attackListTitle;
                }
                if (document.getElementById("noteArea")) {
                    document.getElementById("noteArea").innerHTML = this.noteHtml;
                }
                // Setup controls (reuse your markup)
                this.setupControls();
                this.allTooltipValues = this.getAllTooltipValues(this.currentData);
                const storedTooltips = localStorage.getItem(this.storageKeys.selectedTooltips);
                const storedTooltipValues = localStorage.getItem(this.storageKeys.tooltipValues);
                const currentTooltipValues = this.allTooltipValues.map(item => item.value);
                const previousTooltipValues = storedTooltipValues ? JSON.parse(storedTooltipValues) : [];

                const baseSelections = storedTooltips
                    ? JSON.parse(storedTooltips).filter(value => currentTooltipValues.includes(value))
                    : currentTooltipValues;

                const newTooltipValues = currentTooltipValues.filter(
                    value => !previousTooltipValues.includes(value)
                );

                this.selectedTooltips = new Set(baseSelections);
                newTooltipValues.forEach(value => this.selectedTooltips.add(value));

                localStorage.setItem(
                    this.storageKeys.selectedTooltips,
                    JSON.stringify(Array.from(this.selectedTooltips))
                );
                localStorage.setItem(
                    this.storageKeys.tooltipValues,
                    JSON.stringify(currentTooltipValues)
                );
                this.renderTooltipFilters();
                this.selectedTag = localStorage.getItem(this.storageKeys.selectedTag) || 'all';
                this.renderTagFilters();
                // Continue initialization
                this.allRegularKyuPairs = this.getAllRegularKyuPairs(this.examinationTechniquesTable);
                this.allExamPairs = this.getAllExamTechniquePairs(this.examinationTechniquesTable);
                this.allOtherPairs = this.getAllOtherPairs(this.currentData, this.allRegularKyuPairs);

                this.initKyuSelections();
                this.renderExamRequirementsTable(this.examinationTechniquesTable);
                this.initializeEventListeners();

                // After all DOM is ready and event listeners are set!
                function isMobileDevice() {
                    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
                        || window.matchMedia("(max-width: 768px)").matches;
                }

                this.initCheckbox('stickyFirstCol', !isMobileDevice())
                this.initCheckbox('compactView', !isMobileDevice())
                this.initCheckbox('hideEmpty', true)
                this.initCheckbox('showExamRequirements', true)
                this.initCheckbox('limitTableHeight', false)
                this.initCheckbox('showTags', true)

                this.applyFilters();
                this.tableReady = true;
            });
    }

    initCheckbox(element_id, defaultSetting) {
        const elementCheckbox = document.getElementById(element_id);
        const storageKey = this.storageKeys[element_id] || element_id;
        let elementSetting = localStorage.getItem(storageKey);
        if (elementCheckbox) {
            if (element_id === 'hideEmpty') {
                elementCheckbox.checked = true;
                localStorage.setItem(storageKey, '1');
            } else if (elementSetting !== null) {
                elementCheckbox.checked = (elementSetting === '1');
            } else {
                elementCheckbox.checked = defaultSetting;
            }

            if (element_id === 'stickyFirstCol') {
                this.stickyCheckbox = elementCheckbox.checked;
                this.toggleStickyFirstCol();
            }
            else if (element_id === 'compactView') {
                this.compactView = elementCheckbox.checked;
                this.toggleCompactView();
            }
            else if (element_id === 'hideEmpty') {
                this.hideEmpty = elementCheckbox.checked;
                // this.applyFilters();
            } 
            else if (element_id === 'showExamRequirements') {
                this.showExamRequirements = elementCheckbox.checked;
                this.toggleExamRequirements();
            }
            else if (element_id === 'limitTableHeight') {
                this.limitTableHeight = elementCheckbox.checked;
                this.toggleTableHeight();
            }
            else if (element_id === 'showTags') {
                this.showTags = elementCheckbox.checked;
                this.toggleShowTags();
            }
        }
    }

    setupControls() {
        // Insert controls if not present already. 
        // Assume static HTML for now, can refactor to dynamic if desired.
        // Not doing anything here, but if you want to move controls to JS, you can.
    }

    initKyuSelections() {
        const storedSelections = localStorage.getItem(this.storageKeys.selectedKyus);
        const checkboxes = document.querySelectorAll('#kyuSelector input[type="checkbox"]');
        if (!checkboxes.length) return;

        if (storedSelections) {
            const selectedKyus = JSON.parse(storedSelections).map(value => parseInt(value));
            checkboxes.forEach(cb => {
                cb.checked = selectedKyus.includes(parseInt(cb.value));
            });
            this.selectedKyus = selectedKyus;
        } else {
            this.selectedKyus = Array.from(checkboxes)
                .filter(cb => cb.checked)
                .map(cb => parseInt(cb.value));
        }
    }

    getAllTooltipValues(currentData) {
        const tooltipValues = new Set();
        let hasNoTooltip = false;

        currentData.forEach(row => {
            row.techniques.forEach(tech => {
                (tech.links || []).forEach(link => {
                    const tooltip = (link.tooltip || "").trim();
                    if (tooltip) {
                        tooltipValues.add(tooltip);
                    } else {
                        hasNoTooltip = true;
                    }
                });
            });
        });

        const sortedTooltips = Array.from(tooltipValues).sort((a, b) => a.localeCompare(b));
        const tooltipItems = sortedTooltips.map(value => ({
            value,
            label: value
        }));

        if (hasNoTooltip) {
            tooltipItems.push({
                value: this.noTooltipValue,
                label: 'no tooltip'
            });
        }

        return tooltipItems;
    }

    renderTooltipFilters() {
        const container = document.getElementById('tooltipFilter');
        if (!container) return;

        container.innerHTML = '';

        const label = document.createElement('label');
        label.textContent = 'Filter by tooltip:';
        container.appendChild(label);

        this.allTooltipValues.forEach(item => {
            const tooltipLabel = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = 'tooltipValue';
            checkbox.value = item.value;
            checkbox.checked = this.selectedTooltips.has(item.value);

            tooltipLabel.appendChild(checkbox);
            tooltipLabel.appendChild(document.createTextNode(` ${item.label}`));
            container.appendChild(tooltipLabel);
        });
    }

    renderTagFilters() {
        const container = document.getElementById('tagFilter');
        if (!container) return;

        container.innerHTML = '';

        const label = document.createElement('label');
        label.textContent = 'Filter by tag:';
        container.appendChild(label);

        this.tagOptions.forEach(item => {
            const tagLabel = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'radio';
            checkbox.name = 'tagValue';
            checkbox.value = item.value;
            checkbox.checked = item.value === this.selectedTag;

            tagLabel.appendChild(checkbox);
            tagLabel.appendChild(document.createTextNode(` ${item.label}`));
            container.appendChild(tagLabel);
        });
    }

    getFilteredLinks(links) {
        if (!this.selectedTooltips || this.selectedTooltips.size === 0) {
            return [];
        }

        return (links || []).filter(link => {
            const tooltipValue = (link.tooltip || "").trim();
            const normalizedValue = tooltipValue ? tooltipValue : this.noTooltipValue;
            if (!this.selectedTooltips.has(normalizedValue)) {
                return false;
            }

            if (this.selectedTag === 'all') {
                return true;
            }

            const tagEntry = this.getLinkTagEntry(link);
            if (this.selectedTag === 'favorite') {
                return tagEntry.favorite;
            }

            return tagEntry.status === this.selectedTag;
        });
    }

    getLinkId(link) {
        const text = link.text || '';
        return `${link.url}::${text}`;
    }

    normalizeTagEntry(value) {
        if (!value) {
            return { status: null, favorite: false };
        }

        if (typeof value === 'string') {
            if (value === 'favorite') {
                return { status: null, favorite: true };
            }
            if (value === 'ok' || value === 'not-ok') {
                return { status: value, favorite: false };
            }
        }

        if (typeof value === 'object') {
            return {
                status: value.status || null,
                favorite: Boolean(value.favorite)
            };
        }

        return { status: null, favorite: false };
    }

    getLinkTagEntry(link) {
        const linkId = this.getLinkId(link);
        const entry = this.videoTags[linkId];
        return this.normalizeTagEntry(entry);
    }

    setLinkTagEntry(link, entry) {
        const linkId = this.getLinkId(link);
        if (!entry.status && !entry.favorite) {
            delete this.videoTags[linkId];
        } else {
            this.videoTags[linkId] = entry;
        }
        this.saveTagsToStorage();
    }

    toggleLinkStatus(link, status) {
        const entry = this.getLinkTagEntry(link);
        entry.status = entry.status === status ? null : status;
        this.setLinkTagEntry(link, entry);
        return entry;
    }

    toggleLinkFavorite(link) {
        const entry = this.getLinkTagEntry(link);
        entry.favorite = !entry.favorite;
        this.setLinkTagEntry(link, entry);
        return entry;
    }

    loadTagsFromStorage() {
        try {
            const stored = localStorage.getItem(this.storageKeys.videoTags);
            const parsed = stored ? JSON.parse(stored) : {};
            const normalized = {};
            Object.entries(parsed).forEach(([key, value]) => {
                normalized[key] = this.normalizeTagEntry(value);
            });
            return normalized;
        } catch (error) {
            return {};
        }
    }

    saveTagsToStorage() {
        localStorage.setItem(this.storageKeys.videoTags, JSON.stringify(this.videoTags));
    }

    getSelectedKyus() {
        const checkboxes = document.querySelectorAll('input[name="kyuLevel"]:checked');
        return Array.from(checkboxes).map(cb => Number(cb.value));
    }

    renderExamRequirementsTable(examination_techniques_table) {
        const selectedKyus = this.getSelectedKyus();
        const tbody = document.querySelector(`#${this.examTableId} tbody`);
        if (!tbody) return;
        tbody.innerHTML = "";

        const attackToTechniques = {};
        examination_techniques_table.forEach(entry => {
            if (!selectedKyus.includes(entry.kyu)) return;
            (entry.techniques || []).forEach(techObj => {
                const attack = (techObj.attack || "").trim();
                if (!attack || attack.toLowerCase().includes('__test__')) return;
                if (!(attack in attackToTechniques)) attackToTechniques[attack] = {};
                for (const tech of (techObj.techniques || [])) {
                    if (!(tech in attackToTechniques[attack])) attackToTechniques[attack][tech] = new Set();
                    attackToTechniques[attack][tech].add(entry.kyu);
                }
            });
        });

        Object.keys(attackToTechniques).sort().forEach(attack => {
            const tr = document.createElement('tr');
            const tdAttack = document.createElement('td');
            tdAttack.innerHTML = attack;

            const tdTechs = document.createElement('td');
            const techsRendered = Object.entries(attackToTechniques[attack])
                .map(([tech, kyus]) => {
                    const kyuArr = Array.from(kyus).sort((a, b) => a - b);
                    const videoCount = this.getTechniqueVideoCount(attack, tech);
                    const kyuLabel = `${kyuArr.join(', ')} kyu`;
                    const videoCountHtml = videoCount === 0
                        ? `<span class="exam-video-count is-zero">${videoCount}</span>`
                        : `<span class="exam-video-count">${videoCount}</span>`;
                    const videoLabel = `${videoCountHtml} ${videoCount === 1 ? 'video' : 'videos'}`;
                    return this.compactView
                        ? `${tech} (${kyuArr.join(',')}/${videoCountHtml})` // No spaces for compact view
                        : `${tech} (${kyuLabel} / ${videoLabel})`;
                });

            // Use line breaks in non-compact mode, otherwise join with commas
            tdTechs.innerHTML = this.compactView
                ? techsRendered.join(',')
                // : techsRendered.map(t => `<div>${t}</div>`).join('');
                : techsRendered.join(', ')
            tr.appendChild(tdAttack);
            tr.appendChild(tdTechs);
            tbody.appendChild(tr);
        });
    }

    getTechniqueVideoCount(attack, techniqueName) {
        const attackEntry = this.currentData.find(entry => entry.attack === attack);
        if (!attackEntry) return 0;
        const techniqueEntry = attackEntry.techniques.find(tech => tech.name === techniqueName);
        if (!techniqueEntry) return 0;
        return this.getFilteredLinks(techniqueEntry.links).length;
    }

    getKyuFilteredCells(examinationTechniquesTable) {
        const selectedKyus = this.selectedKyus;
        const allowed = new Set();

        // Step 1: Add entries matching checked kyu levels (1-6)
        examinationTechniquesTable.forEach(row => {
            if (selectedKyus.includes(row.kyu) && row.kyu > 0) {
                row.techniques.forEach(attackTechs => {
                    const attack = attackTechs.attack;
                    (attackTechs.techniques||[]).forEach(tech => {
                        allowed.add(`${attack}::${tech}`);
                    });
                });
            }
        });

        // Step 2: Explicitly add known "Other" techniques
        if (selectedKyus.includes(-1)) {
            this.allOtherPairs.forEach(key => allowed.add(key));
        }

        return allowed;
    }

    getAllRegularKyuPairs(examinationTechniquesTable) {
        const set = new Set();
        examinationTechniquesTable.forEach(row => {
            if (row.kyu >= 1 && row.kyu <= 6) {
                row.techniques.forEach(attackTechs => {
                    const attack = attackTechs.attack;
                    (attackTechs.techniques||[]).forEach(tech => {
                        set.add(`${attack}::${tech}`);
                    });
                });
            }
        });
        return set;
    }

    getAllExamTechniquePairs(examinationTechniquesTable) {
        const all = new Set();
        examinationTechniquesTable.forEach(row => {
            row.techniques.forEach(attackTechs => {
                const attack = attackTechs.attack;
                (attackTechs.techniques || []).forEach(tech => {
                    all.add(`${attack}::${tech}`);
                });
            });
        });
        return all;
    }

    getAllOtherPairs(currentData, regularPairs) {
        const other = new Set();
        currentData.forEach(row => {
            row.techniques.forEach(tech => {
                const key = `${row.attack}::${tech.name}`;
                if (tech.links.length > 0 && !regularPairs.has(key)) {
                    other.add(key);
                }
            });
        });
        return other;
    } 


    initializeEventListeners() {
        // Search functionality
        document.getElementById('attackInput').addEventListener('input', (e) => {
            this.attackSearchTerm = this.normalizeAttackText(e.target.value);
            this.applyFilters();
        });
        document.getElementById('techniqueInput').addEventListener('input', (e) => {
            this.techniqueSearchTerm = e.target.value.toLowerCase();
            this.applyFilters();
        });

        // Kyu selection
        document.getElementById('kyuSelector').addEventListener('change', () => {
            this.renderExamRequirementsTable(this.examinationTechniquesTable);
            this.selectedKyus = Array.from(
                document.querySelectorAll('#kyuSelector input[type="checkbox"]:checked')
            ).map(cb => parseInt(cb.value));
            localStorage.setItem(this.storageKeys.selectedKyus, JSON.stringify(this.selectedKyus));
            this.applyFilters();
        });

        // View controls
        document.getElementById('stickyFirstCol').addEventListener('change', (e) => {
            this.stickyCheckbox = e.target.checked;
            this.toggleStickyFirstCol();
            // Save setting
            localStorage.setItem(this.storageKeys.stickyFirstCol, e.target.checked ? '1' : '0');
        });

        // View controls
        document.getElementById('compactView').addEventListener('change', (e) => {
            this.compactView = e.target.checked;
            this.toggleCompactView();
            localStorage.setItem(this.storageKeys.compactView, e.target.checked ? '1' : '0');
        });

        document.getElementById('hideEmpty').addEventListener('change', (e) => {
            this.hideEmpty = e.target.checked;
            this.applyFilters();
            localStorage.setItem(this.storageKeys.hideEmpty, e.target.checked ? '1' : '0');
        });

        const showExamRequirements = document.getElementById('showExamRequirements');
        if (showExamRequirements) {
            showExamRequirements.addEventListener('change', (e) => {
                this.showExamRequirements = e.target.checked;
                this.toggleExamRequirements();
                localStorage.setItem(this.storageKeys.showExamRequirements, e.target.checked ? '1' : '0');
            });
        }

        const limitTableHeight = document.getElementById('limitTableHeight');
        if (limitTableHeight) {
            limitTableHeight.addEventListener('change', (e) => {
                this.limitTableHeight = e.target.checked;
                this.toggleTableHeight();
                localStorage.setItem(this.storageKeys.limitTableHeight, e.target.checked ? '1' : '0');
            });
        }

        const showTags = document.getElementById('showTags');
        if (showTags) {
            showTags.addEventListener('change', (e) => {
                this.showTags = e.target.checked;
                this.toggleShowTags();
                localStorage.setItem(this.storageKeys.showTags, e.target.checked ? '1' : '0');
            });
        }

        const tooltipFilter = document.getElementById('tooltipFilter');
        if (tooltipFilter) {
            tooltipFilter.addEventListener('change', () => {
                this.selectedTooltips = new Set(
                    Array.from(
                        document.querySelectorAll('#tooltipFilter input[type="checkbox"]:checked')
                    ).map(cb => cb.value)
                );
                localStorage.setItem(
                    this.storageKeys.selectedTooltips,
                    JSON.stringify(Array.from(this.selectedTooltips))
                );
                this.applyFilters();
            });
        }

        const tagFilter = document.getElementById('tagFilter');
        if (tagFilter) {
            tagFilter.addEventListener('change', () => {
                const selected = document.querySelector('#tagFilter input[type="radio"]:checked');
                this.selectedTag = selected ? selected.value : 'all';
                localStorage.setItem(this.storageKeys.selectedTag, this.selectedTag);
                this.applyFilters();
            });
        }

        // Table highlighting
        this.setupTableHighlighting();
    }

    normalizeAttackText(value) {
        return (value || '')
            .replace(/<br\s*\/?\s*>/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    applyFilters() {
        const allowed = this.getKyuFilteredCells(this.examinationTechniquesTable);
        const allTechNames = this.currentData[0].techniques.map(t => t.name);

        // Decide which columns to show (based on technique name filter)
        let visibleTechniqueNames;
        if (!this.techniqueSearchTerm) {
            visibleTechniqueNames = allTechNames;
        } else {
            visibleTechniqueNames = allTechNames.filter(name =>
                name.toLowerCase().includes(this.techniqueSearchTerm)
            );
        }
        this.visibleTechniqueNames = visibleTechniqueNames;

        // Now, filter attacks (rows)
        this.filteredData = this.currentData.filter(technique => {
            if (technique.attack.includes('__test__')) return false;

            // Filter attacks (rows)
            if (this.attackSearchTerm) {
                const normalizedAttack = this.normalizeAttackText(technique.attack);
                if (!normalizedAttack.includes(this.attackSearchTerm)) return false;
            }
            
            // Keep row only if at least one technique cell is allowed AND matches visibleTechniqueNames
            return technique.techniques.some(
                t => {
                    const filteredLinks = this.getFilteredLinks(t.links);
                    return (
                        allowed.has(`${technique.attack}::${t.name}`) &&
                        visibleTechniqueNames.includes(t.name) &&
                        filteredLinks.length > 0
                    );
                }
            );
        });


        // Recalculate total techniques for filtered data
        const totalTechniques = this.filteredData.reduce((count, technique) => {
            return count + technique.techniques.filter(
                t => {
                    const filteredLinks = this.getFilteredLinks(t.links);
                    return allowed.has(`${technique.attack}::${t.name}`) && filteredLinks.length > 0;
                }
            ).length;
        }, 0);

        this.refreshTable(allowed);
        this.updateStats(totalTechniques);
        this.renderExamRequirementsTable(this.examinationTechniquesTable);
    }

    refreshTable(allowedSet = null) {
        const table = document.getElementById('aikidoTable');
        const tbody = table.querySelector('tbody');
        const headerRow = table.querySelector('thead tr');
        tbody.innerHTML = '';

        // 19 technique columns
        const columnCount = 19;
        let columnsWithContent = Array(columnCount).fill(false);

        // Check which columns have content
        this.filteredData.forEach(technique => {
            technique.techniques.forEach((tech, colIdx) => {
                const allowed = allowedSet ? allowedSet.has(`${technique.attack}::${tech.name}`) : true;
                const filteredLinks = this.getFilteredLinks(tech.links);
                if (allowed && filteredLinks.length > 0) columnsWithContent[colIdx] = true;
            });
        });

        // console.log(this.hideEmpty)

        // Hide empty columns if needed (and hide columns in header too)
        // }
        for (let i = 0; i < columnCount; i++) {
            const th = headerRow.children[i + 1]; // +1 for attack col
            const techName = this.currentData[0].techniques[i].name;
            if (!this.visibleTechniqueNames.includes(techName)) {
                th.style.display = 'none';
            } else if (this.hideEmpty && !columnsWithContent[i]) {
                th.style.display = 'none';
            } else {
                th.style.display = '';
            }
        }

        // Loop through filteredData rows:
        this.filteredData.forEach(technique => {
            const row = document.createElement('tr');
            // Attack column
            const attackCell = document.createElement('td');
            // attackCell.textContent = technique.attack;
            attackCell.innerHTML = technique.attack;
            row.appendChild(attackCell);

            technique.techniques.forEach((tech, colIdx) => {
                const cell = document.createElement('td');

                // Check if cell is allowed
                const allowed = allowedSet ? allowedSet.has(`${technique.attack}::${tech.name}`) : true;
                const filteredLinks = this.getFilteredLinks(tech.links);

                if (!allowed) {
                    cell.classList.add('empty-cell');
                    cell.textContent = ''; // Or '—'
                    // do not render links etc
                } else if (filteredLinks.length === 0) {
                    cell.classList.add('empty-cell');
                    if (!this.hideEmpty) cell.textContent = '—';
                } else {
                    filteredLinks.forEach((link, index) => {
                        const linkWrapper = document.createElement('div');
                        linkWrapper.className = 'video-link';

                        const a = document.createElement('a');

                        let isYouTubeLink = link.url.includes("youtube.com") || link.url.includes("youtu.be");

                        if (isYouTubeLink && /Android/i.test(navigator.userAgent)) {
                            // Just replace the https:// part with the intent:// form
                            a.href = link.url.replace(/^https?:\/\//, 'intent://') +
                                    '#Intent;package=com.google.android.youtube;scheme=https;end';
                        } else {
                            // iOS + desktop: regular link (opens in browser or YouTube app if installed)
                            a.href = link.url;
                        }

                        a.target = "_blank";
                        a.rel = "noopener noreferrer";
                        const tooltipText = (link.tooltip || "").trim();
                        if (tooltipText) {
                            a.textContent = `${link.text} (${tooltipText.charAt(0)})`;
                        } else {
                            a.textContent = link.text;
                        }
                        linkWrapper.appendChild(a);

                        if (tooltipText) {
                            a.className = "tooltip"; // add tooltip class if needed for styling

                            const tooltipSpan = document.createElement("span");
                            tooltipSpan.className = "tooltip-text";
                            tooltipSpan.innerHTML = link.tooltip;
                            a.appendChild(tooltipSpan);
                        }                        

                        const tagControls = document.createElement('div');
                        tagControls.className = 'video-tag-controls';
                        const tagEntry = this.getLinkTagEntry(link);
                        const statusButtons = [
                            { value: 'ok', label: '✔️', title: 'ok' },
                            { value: 'not-ok', label: '❌', title: 'not ok' }
                        ];
                        statusButtons.forEach(buttonConfig => {
                            const button = document.createElement('button');
                            button.type = 'button';
                            button.className = 'video-tag-button';
                            button.dataset.tag = buttonConfig.value;
                            button.textContent = buttonConfig.label;
                            button.title = buttonConfig.title;
                            if (tagEntry.status === buttonConfig.value) {
                                button.classList.add('is-active');
                            }
                            button.addEventListener('click', (event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                this.toggleLinkStatus(link, buttonConfig.value);
                                this.applyFilters();
                            });
                            tagControls.appendChild(button);
                        });

                        const favoriteButton = document.createElement('button');
                        favoriteButton.type = 'button';
                        favoriteButton.className = 'video-tag-button';
                        favoriteButton.dataset.tag = 'favorite';
                        favoriteButton.textContent = '⭐';
                        favoriteButton.title = 'favorite';
                        if (tagEntry.favorite) {
                            favoriteButton.classList.add('is-active');
                        }
                        favoriteButton.addEventListener('click', (event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            this.toggleLinkFavorite(link);
                            this.applyFilters();
                        });
                        tagControls.appendChild(favoriteButton);

                        linkWrapper.appendChild(tagControls);
                        cell.appendChild(linkWrapper);
                    });
                }

                // Hide this cell if column is hidden (and not the attack column)
                // if (this.hideEmpty && !columnsWithContent[colIdx]) cell.style.display = 'none';
                // else cell.style.display = '';
                const techName = this.currentData[0].techniques[colIdx].name;
                if (!this.visibleTechniqueNames.includes(techName)) {
                    cell.style.display = 'none';
                } else if (this.hideEmpty && !columnsWithContent[colIdx]) {
                    cell.style.display = 'none';
                } else {
                    cell.style.display = '';
                }

                row.appendChild(cell);
            });
            tbody.appendChild(row);
        });
    }

    setupTableHighlighting() {
        const table = document.getElementById('aikidoTable');
        
        table.addEventListener('mouseover', (event) => {
            const cell = event.target.closest('td, th');
            if (!cell) return;

            const row = cell.parentElement;
            const colIndex = cell.cellIndex;
            const isHeaderCell = cell.tagName === 'TH';
            const isFirstColumn = colIndex === 0;

            if (isHeaderCell && isFirstColumn) {
                // just ignore
                return;
            }

            // Always highlight the current cell
            cell.classList.add('highlight-cell');

            if (isHeaderCell) {
                // Header cells: ONLY highlight column (no row highlighting)
                Array.from(table.rows).forEach(r => {
                    if (r.cells[colIndex] && r.cells[colIndex] !== cell) {
                        r.cells[colIndex].classList.add('highlight-col');
                    }
                });
            } else if (isFirstColumn) {
                // First column cells: ONLY highlight row (no column highlighting)
                Array.from(row.children).forEach(c => {
                    if (c !== cell) c.classList.add('highlight-row');
                });
            } else {
                // Regular data cells: highlight both row and column
                Array.from(row.children).forEach(c => {
                    if (c !== cell) c.classList.add('highlight-row');
                });

                Array.from(table.rows).forEach(r => {
                    if (r.cells[colIndex] && r.cells[colIndex] !== cell) {
                        r.cells[colIndex].classList.add('highlight-col');
                    }
                });
            }
        });

        table.addEventListener('mouseout', (event) => {
            const cell = event.target.closest('td, th');
            if (!cell) return;

            const row = cell.parentElement;
            const colIndex = cell.cellIndex;

            // Remove all highlights
            Array.from(row.children).forEach(c => {
                c.classList.remove('highlight-row');
            });

            Array.from(table.rows).forEach(r => {
                if (r.cells[colIndex]) {
                    r.cells[colIndex].classList.remove('highlight-col');
                }
            });

            cell.classList.remove('highlight-cell');
        });
    }

    toggleStickyFirstCol() {
        const container = document.getElementById('mainTableContainer');
        container.classList.toggle('sticky-first-col', this.stickyCheckbox);
    }

    toggleCompactView() {
        const containers = [
            document.getElementById('examRequirementsTable'),
            // querySelector.getElementById('.exam-section'),
            document.getElementById('mainTableContainer')
        ];
        containers.forEach(container => {
            container.classList.toggle('compact-view', this.compactView);
        });
        
        // Re-render exam table to reflect new compact state
        this.renderExamRequirementsTable(this.examinationTechniquesTable);
    }

    toggleExamRequirements() {
        const examSection = document.querySelector('.exam-section');
        if (!examSection) return;
        examSection.classList.toggle('is-collapsed', !this.showExamRequirements);
    }

    toggleTableHeight() {
        const container = document.getElementById('mainTableContainer');
        if (!container) return;
        container.classList.toggle('is-limited-height', this.limitTableHeight);
    }

    toggleShowTags() {
        const container = document.getElementById('mainTableContainer');
        if (!container) return;
        container.classList.toggle('hide-tags', !this.showTags);
    }

    // updateStats(totalTechniques) {
    //     const totalAttacks = this.filteredData.length;
    //     // const totalVideos = this.filteredData.reduce((sum, technique) => {
    //     //     return sum + technique.techniques.reduce((techSum, tech) => {
    //     //         return techSum + tech.links.length;
    //     //     }, 0);
    //     // }, 0);
    //     // Always use suwariWazaTechniquesTable, never a filtered list.
    //     const totalVideos = this.currentData.reduce(
    //     (acc, attack) =>
    //         acc +
    //         attack.techniques.reduce((sum, t) => sum + t.links.length, 0),
    //     0
    //     );        

    //     // const totalPossibleTechniques = this.filteredData.length * 19; // 19 techniques per attack
    //     const availableTechniques = this.filteredData.reduce((sum, technique) => {
    //         return sum + technique.techniques.filter(tech => tech.links.length > 0).length;
    //     }, 0);


    //     document.getElementById('attackCount').textContent = `${totalAttacks}/${availableTechniques} ${totalTechniques}`;
    //     // document.getElementById('attackCount').textContent = `${totalAttacks}/${availableTechniques}`;
    //     document.getElementById('videoCount').textContent = totalVideos;
    // }

    updateStats(totalTechniques) {
        const totalAttacks = this.filteredData.length;
        const selectedExamPairs = this.getKyuFilteredCells(this.examinationTechniquesTable);

        // Count only videos from selected exam techniques
        const selectedVideos = this.filteredData.reduce((sum, attackEntry) => {
            const attack = attackEntry.attack;
            return sum + attackEntry.techniques.reduce((techSum, tech) => {
                const key = `${attack}::${tech.name}`;
                const filteredLinks = this.getFilteredLinks(tech.links);
                return techSum + (selectedExamPairs.has(key) ? filteredLinks.length : 0);
            }, 0);
        }, 0);

        // Count all available video references regardless of selection
        // const totalVideos = this.filteredData.reduce((sum, attackEntry) => {
        //     return sum + attackEntry.techniques.reduce((techSum, tech) => {
        //         return techSum + tech.links.length;
        //     }, 0);
        // }, 0);
        const totalVideos = this.currentData.reduce(
        (acc, attack) =>
            acc +
            attack.techniques.reduce((sum, t) => {
                return sum + this.getFilteredLinks(t.links).length;
            }, 0),
        0
        );     

        // Count of all examination techniques
        const totalExamTechniqueCount = this.allExamPairs.size;

        // Update UI
        document.getElementById('attackCount').textContent = `${totalAttacks}`;

        document.getElementById('videoCount').textContent = `${selectedVideos}/${totalVideos}`;

        const examCountElement = document.getElementById('examTechCount');
        if (examCountElement) {
            examCountElement.textContent =
                `${totalTechniques}/${totalExamTechniqueCount}`;
        }
    }

}
