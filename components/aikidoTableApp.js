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
                // Continue initialization
                this.allRegularKyuPairs = this.getAllRegularKyuPairs(this.examinationTechniquesTable);
                this.allExamPairs = this.getAllExamTechniquePairs(this.examinationTechniquesTable);
                this.allOtherPairs = this.getAllOtherPairs(this.currentData, this.allRegularKyuPairs);

                this.renderExamRequirementsTable(this.examinationTechniquesTable);
                this.initializeEventListeners();

                // After all DOM is ready and event listeners are set!
                const stickyFirstColCheckbox = document.getElementById('stickyFirstCol');
                this.stickyCheckbox = stickyFirstColCheckbox.checked;
                this.toggleStickyFirstCol();

                this.applyFilters();
                this.tableReady = true;
            });
    }

    setupControls() {
        // Insert controls if not present already. 
        // Assume static HTML for now, can refactor to dynamic if desired.
        // Not doing anything here, but if you want to move controls to JS, you can.
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
                    return this.compactView
                        ? `${tech} (${kyuArr.join(',')})` // No spaces for compact view
                        : `${tech} (${kyuArr.join(', ')})`;
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
            this.attackSearchTerm = e.target.value.toLowerCase();
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
            this.applyFilters();
        });

        // View controls
        document.getElementById('stickyFirstCol').addEventListener('change', (e) => {
            this.stickyCheckbox = e.target.checked;
            this.toggleStickyFirstCol();
        });

        // View controls
        document.getElementById('compactView').addEventListener('change', (e) => {
            this.compactView = e.target.checked;
            this.toggleCompactView();
        });

        document.getElementById('hideEmpty').addEventListener('change', (e) => {
            this.hideEmpty = e.target.checked;
            this.applyFilters();
        });

        // Table highlighting
        this.setupTableHighlighting();
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
            if (this.attackSearchTerm && !technique.attack.toLowerCase().includes(this.attackSearchTerm)) return false;
            
            // Keep row only if at least one technique cell is allowed AND matches visibleTechniqueNames
            return technique.techniques.some(
                t =>
                    allowed.has(`${technique.attack}::${t.name}`) &&
                    visibleTechniqueNames.includes(t.name) &&
                    t.links.length > 0
            );
        });


        // Recalculate total techniques for filtered data
        const totalTechniques = this.filteredData.reduce((count, technique) => {
            return count + technique.techniques.filter(
                t => allowed.has(`${technique.attack}::${t.name}`)
            ).length;
        }, 0);

        this.refreshTable(allowed);
        this.updateStats(totalTechniques);
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
                if (allowed && tech.links.length > 0) columnsWithContent[colIdx] = true;
            });
        });

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

                if (!allowed) {
                    cell.classList.add('empty-cell');
                    cell.textContent = ''; // Or '—'
                    // do not render links etc
                } else if (tech.links.length === 0) {
                    cell.classList.add('empty-cell');
                    if (!this.hideEmpty) cell.textContent = '—';
                } else {
                    tech.links.forEach((link, index) => {
                        const a = document.createElement('a');

                        let isYouTubeLink = link.url.includes("youtube.com") || link.url.includes("youtu.be");
                        if (isYouTubeLink && /Android/i.test(navigator.userAgent)) {
                            const videoIdMatch = link.url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                            if (videoIdMatch) {
                                a.href = `intent://www.youtube.com/watch?v=${videoIdMatch[1]}#Intent;package=com.google.android.youtube;scheme=https;end`;
                            } else {
                                a.href = link.url;
                            }
                        } else {
                            a.href = link.url;
                        }

                        a.target = "_blank";
                        a.rel = "noopener noreferrer";
                        a.textContent = link.text;
                        cell.appendChild(a);
                        if (index < tech.links.length - 1) {
                            cell.appendChild(document.createElement("br"));
                        }

                        if (link.tooltip) {
                            a.className = "tooltip"; // add tooltip class if needed for styling

                            const tooltipSpan = document.createElement("span");
                            tooltipSpan.className = "tooltip-text";
                            tooltipSpan.innerHTML = link.tooltip;
                            a.appendChild(tooltipSpan);
                        }                        
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
                return techSum + (selectedExamPairs.has(key) ? tech.links.length : 0);
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
            attack.techniques.reduce((sum, t) => sum + t.links.length, 0),
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
