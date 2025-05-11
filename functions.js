    const table = document.querySelector("#aikidoTable");
    table.addEventListener("mouseover", (event) => {
        const cell = event.target.closest("td, th");
        if (!cell) return;

        const row = cell.parentElement;
        const colIndex = cell.cellIndex;

        // Highlight row
        for (const row_cell of row.children) {
          if (row_cell != cell) {
            if (row_cell.classList.contains("empty-cell")) {
              row_cell.classList.add("highlight-row-dark");
            } else {
              row_cell.classList.add("highlight-row");
            }
          }
        }

        // Highlight column
        for (const r of table.rows) {
            const targetCell = r.cells[colIndex];
            if (targetCell != cell) {
              if (targetCell.classList.contains("empty-cell")) {
                  targetCell.classList.add("highlight-col-dark");
              } else {
                  targetCell.classList.add("highlight-col");
              }            
            }
        }

        // Highlight hovered cell
        if (cell.classList.contains("empty-cell")) {
            cell.classList.add("highlight-cell-dark");
            // cell.innerHTML = "dark";
        } else {
            cell.classList.add("highlight-cell");
            // cell.innerHTML = "normal";
        }        
    });

    table.addEventListener("mouseout", (event) => {
        const cell = event.target.closest("td, th");
        if (!cell) return;
        // cell.innerHTML = "";

        const row = cell.parentElement;
        const colIndex = cell.cellIndex;

        // Remove row highlight
        for (const row_cell of row.children) {
          if (row_cell != cell) {
            row_cell.classList.remove("highlight-row", "highlight-row-dark");
          }
}
        // Remove column highlight
        for (const r of table.rows) {
            const targetCell = r.cells[colIndex];
            if (targetCell != cell) {
              if (targetCell.classList.contains("empty-cell")) {
                  targetCell.classList.remove("highlight-col-dark");
              } else {
                  targetCell.classList.remove("highlight-col");
              }            
            }
        }

        // Remove cell highlight
        if (cell.classList.contains("empty-cell")) {
            cell.classList.remove("highlight-cell-dark");
        } else {
            cell.classList.remove("highlight-cell");
        }    
    });

    // Add highlight CSS dynamically
    const style = document.createElement('style');
    style.textContent = `
      td, th {
        transition: background-color 0.3s ease;
      }

      .highlight-col {
        background-color: rgba(255, 235, 59, 0.3);
      }

      .highlight-row {
        background-color: rgba(173, 216, 230, 0.6) !important;
      }

      .highlight-cell {
        background-color: rgba(144, 238, 144, 0.5) !important;
      }

      .empty-cell {
        background-color: lightgray;
      }

      .highlight-cell-dark {
        background-color: rgba(40, 80, 40, 0.6) !important;
      }

      .highlight-col-dark {
        background-color: rgba(100, 100, 70, 0.4) !important;
      }

      .highlight-row-dark {
        background-color: rgba(80, 100, 100, 0.5) !important;
      }
    `;

    document.head.appendChild(style);    

    function getListOfExamAttacks(selectedKyus) {
        const attacksSet = new Set();

        examination_techniques_table.forEach(entry => {
            if (selectedKyus.includes(entry.kyu)) {
                entry.techniques.forEach(item => {
                    attacksSet.add(item.attack);
                });
            }
        });

        return Array.from(attacksSet);
    }

    function getExamRequirements(attack, selectedKyus) {
        const techniques = [];

        examination_techniques_table.forEach(entry => {
            if (selectedKyus.includes(entry.kyu)) {
                entry.techniques.forEach(item => {
                    if (item.attack === attack) {
                        techniques.push(...item.techniques);
                    }
                });
            }
        });

        return techniques;
    }

    function getOther() {
        // get all exam techniques
        const all_exam_techniques = []
        getListOfExamAttacks([1, 2, 3, 4, 5, 6]).forEach(attack => {
            const techniques = getExamRequirements(attack, [1, 2, 3, 4, 5, 6]);
            all_exam_techniques.push({attack: attack, techniques: techniques});
        });
        console.log("all_exam_techniques", all_exam_techniques);

        // Now compare against the full list
        // for each attack in techniques_table get list of techniques names
        const all_possible_techniques = {}
        techniques_table.forEach(technique => {
            const attack = technique.attack;
            if (attack === "__test__") {
                return; // Skip the test row
            }

            const techniques = technique.techniques.map(t => t.name);
            all_possible_techniques[attack] = techniques;
            // if attack in all_exam_techniques attack field exclude  techniques from all_possible_techniques[attack]
            const exam_technique = all_exam_techniques.find(t => t.attack === attack);
            if (exam_technique) {
                exam_technique.techniques.forEach(tech => {
                    if (all_possible_techniques[attack].includes(tech)) {
                        all_possible_techniques[attack] = all_possible_techniques[attack].filter(t => t !== tech);
                    }
                });
            }
        });

        other_techniques = Object.entries(all_possible_techniques).map(([attack, techniques]) => {
            return { attack: attack, techniques: techniques };
        });

        return other_techniques;
    }
    const non_examination_techniques_table = getOther();
    console.log("non_examination_techniques_table", non_examination_techniques_table);


    // Function to refresh list for exam requirements table
    function refreshExamRequirementsTable(selectedKyus) {
        // log selectedKyu
        console.log("Selected Kyu level for exam requirements:", selectedKyus);
        const tbody = document.querySelector("#examRequirementsTable tbody");
        tbody.innerHTML = ""; // Clear existing rows

        getListOfExamAttacks(selectedKyus).forEach(attack => {
            const tr = document.createElement("tr");
            const th = document.createElement("th");
            th.textContent = attack;
            tr.appendChild(th);

            const td = document.createElement("td");
            td.textContent = getExamRequirements(attack, selectedKyus).join(", ")
            tr.appendChild(td);

            tbody.appendChild(tr);
        });
    }

    // Function to refresh the table based on selected Kyu
    function refreshTable(selectedKyus) {
      const tbody = document.querySelector("#aikidoTable tbody");
      tbody.innerHTML = ""; // Clear existing rows

      // get lit of technique names for the techniques_table entry with technique.attack === "__test__"
      const techniqueNames = techniques_table.find(tech => tech.attack === "__test__").techniques.map(tech => tech.name);

      // use getListOfExamAttacks(selectedKyus) to form list_of_valid_attacks and if selectedKyus include -1 append list of attacks from non_examination_techniques_table
      const list_of_valid_attacks = getListOfExamAttacks(selectedKyus);
      // Log attacks from list_of_valid_attacks that aren't in techniques_table
      const tableAttacks = techniques_table.map(t => t.attack);
      list_of_valid_attacks.forEach(validAttack => {
          if (!tableAttacks.includes(validAttack)) {
            console.error(`Kyu exam attack '${validAttack}' is not present in techniques_table`);
          }
      });      
      if (selectedKyus.includes(-1)) {
          non_examination_techniques_table.forEach(technique => {
              list_of_valid_attacks.push(technique.attack);
          });
      }
      console.log("list_of_valid_attacks", list_of_valid_attacks);

      techniques_table.forEach(technique => {
          if (technique.attack === "__test__") {
              return; // Skip the test row
          }

          const tr = document.createElement("tr");
          const th = document.createElement("th");
          // th.textContent = technique.attack;
          th.innerHTML = technique.attack;
          tr.appendChild(th);

          // check if the techniques' names follow the same order as the techniqueNames array
          const currentNames = technique.techniques.map(tech => tech.name);
          const namesMatch =
            currentNames.length === techniqueNames.length &&
            currentNames.every((name, i) => name === techniqueNames[i]);

          if (!namesMatch) {
              console.error(`Technique names do not match for ${technique.attack}`);
              
              // Display the error on the page
              const errorMessage = document.createElement("div");
              errorMessage.textContent = `Technique names do not match for ${technique.attack}`;
              errorMessage.style.color = "red";
              errorMessage.style.fontWeight = "bold";
              errorMessage.style.fontSize = "1.2em";
              errorMessage.style.margin = "10px 0";
              document.body.appendChild(errorMessage);
              return; // Skip this row
          }

          // check if technique.attack is on the list of names in exam.techniques
          const isOnList = list_of_valid_attacks.includes(technique.attack)
          const exam_validNames = [];
          const all_validNames = [];
          if (!isOnList) {
            //   console.info(`Technique ${technique.attack} is not on the list of names in exam.techniques`);
              // there are no valid names for this technique
          }
          else {
              // get the valid names for this technique
              // update validNames with exam.techniques.find(t => t.attack === technique.attack)?.techniques || [];
              exam_validNames.push(...getExamRequirements(technique.attack, selectedKyus));
              all_validNames.push(...getExamRequirements(technique.attack, selectedKyus));
              // if selectedKyus include -1 append list of techniques from non_examination_techniques_table
              if (selectedKyus.includes(-1)) {
                  const nonExamTech = non_examination_techniques_table.find(t => t.attack === technique.attack);
                  if (nonExamTech) {
                      all_validNames.push(...nonExamTech.techniques);
                  }
              }

              
          }
        //   console.log("validNames", validNames);

          technique.techniques.forEach(tech => {
              // tech
              const td = document.createElement("td");
              const exam_allowed = !exam_validNames || exam_validNames.includes(tech.name);
              if (exam_allowed && tech.links.length === 0) {
                  console.warn(`Technique '${tech.name}' in '${technique.attack}' is expected (valid) but has no links`);
              }


              const allowed = !all_validNames || all_validNames.includes(tech.name);
              if (tech.links.length === 0 || !allowed) {
                  // td.style.backgroundColor = "lightgray";
                  td.classList.add("empty-cell");
              } else {
                  tech.links.forEach((link, index) => {
                      const a = document.createElement("a");
                      // a.href = link.url;

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
                      td.appendChild(a);
                      if (index < tech.links.length - 1) {
                          td.appendChild(document.createElement("br"));
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
              tr.appendChild(td);
          });

          // document.querySelector("#aikidoTable tbody").appendChild(tr);
          tbody.appendChild(tr);
      });
    }

    // Initial table render
    // get initial selected kyu from the checkboxes
    const selectedKyus = Array.from(document.querySelectorAll('#kyuForm input[type="checkbox"]:checked')).map(cb => parseInt(cb.value));
    refreshTable(selectedKyus);
    refreshExamRequirementsTable(selectedKyus)

    // // Listen for kyu selection change (radios)
    // document.getElementById("kyuForm").addEventListener("change", (e) => {
    //     const selectedKyu = parseInt(e.target.value);
    //     refreshTable(selectedKyu);
    //     refreshExamRequirementsTable(selectedKyu);
    // });    

    // Listen for checkbox changes
    document.getElementById("kyuForm").addEventListener("change", () => {
        const selectedKyus = Array.from(document.querySelectorAll('#kyuForm input[type="checkbox"]:checked')).map(cb => parseInt(cb.value));
        console.log("Selected Kyus level for exam requirements:", selectedKyus);
        refreshTable(selectedKyus);
        refreshExamRequirementsTable(selectedKyus);
    });  