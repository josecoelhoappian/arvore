// Dados carregados dos ficheiros
let places = [];
let persons = [];
let marriages = [];
let relationships = [];

// Mapeamentos para acesso rápido
let placesMap = {};
let personsMap = {};
let marriagesMap = {};
let childrenMap = {}; // Mapa de família para filhos
let parentsMap = {}; // Mapa de pessoa para seus pais

// Pessoa selecionada atualmente
let selectedPerson = null;
let lastSearchResult = null; // Armazena o último resultado de pesquisa

// Variáveis para elementos DOM
let searchInput, personList, treeContainer, detailsPanel, detailsContent;
let relationshipBadge, searchButton, clearSearchButton;
let searchResults;
let treeTab, detailsTab, treePane, detailsPane;

// Variável para rastrear orientação
let isLandscape = false;

// Função para remover acentos
function removeAccents(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Função para normalizar texto para busca (remove acentos, converte para minúsculas)
function normalizeSearchText(text) {
    if (!text) return '';
    return removeAccents(text.toLowerCase());
}

// Inicializar quando a página carrega
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    initializeEventListeners();
    loadAllFiles();
    showMessage('A carregar dados...', 'info');
    
    // Verificar orientação inicial
    checkOrientation();
    
    // Ajustar layout inicial
    adjustLayoutForScreen();
});

// Verificar orientação do dispositivo
function checkOrientation() {
    isLandscape = window.innerWidth > window.innerHeight;
    
    // Adicionar listener para mudanças de orientação
    window.addEventListener('resize', function() {
        const newIsLandscape = window.innerWidth > window.innerHeight;
        if (newIsLandscape !== isLandscape) {
            isLandscape = newIsLandscape;
            adjustLayoutForScreen();
            
            // Se houver uma pessoa selecionada, regenerar a árvore
            if (selectedPerson) {
                selectPerson(selectedPerson.id);
            }
        }
    });
}

// Ajustar layout para diferentes tamanhos de tela
function adjustLayoutForScreen() {
    const treeContainer = document.getElementById('tree-container');
    const sidebar = document.querySelector('.sidebar');
    const mainContentWrapper = document.querySelector('.main-content-wrapper');
    
    if (!treeContainer || !sidebar) return;
    
    // Verificar se é landscape no mobile
    const isMobileLandscape = window.innerWidth <= 767 && window.innerWidth > window.innerHeight;
    
    if (isMobileLandscape) {
        // Mobile landscape - layout horizontal
        treeContainer.style.minHeight = '300px';
        treeContainer.style.maxHeight = 'none';
        treeContainer.style.height = '100%';
        sidebar.style.height = '100%';
        sidebar.style.flex = '0 0 200px';
        
        // Ajustar altura total
        const containerHeight = window.innerHeight;
        const headerHeight = document.querySelector('header').offsetHeight;
        const searchHeight = document.querySelector('.search-section').offsetHeight;
        const footerHeight = document.querySelector('footer').offsetHeight;
        
        const availableHeight = containerHeight - headerHeight - searchHeight - footerHeight - 30;
        if (mainContentWrapper) {
            mainContentWrapper.style.height = Math.max(300, availableHeight) + 'px';
        }
        
    } else if (window.innerWidth <= 767) {
        // Mobile portrait
        const availableHeight = window.innerHeight - 250;
        treeContainer.style.minHeight = Math.max(400, availableHeight) + 'px';
        treeContainer.style.maxHeight = 'calc(100vh - 250px)';
        sidebar.style.height = '160px';
        
        // Also adjust the main content wrapper height
        if (mainContentWrapper) {
            mainContentWrapper.style.gap = '8px';
            mainContentWrapper.style.minHeight = 'calc(100vh - 200px)';
        }
    } else if (window.innerWidth >= 1200) {
        // Large desktop
        treeContainer.style.minHeight = '600px';
    } else {
        // Tablet/medium desktop
        treeContainer.style.minHeight = '500px';
    }
}

// Inicializar elementos DOM
function initializeElements() {
    searchInput = document.getElementById('search-input');
    personList = document.getElementById('person-list');
    treeContainer = document.getElementById('tree-container');
    detailsPanel = document.getElementById('details-panel');
    detailsContent = document.getElementById('details-content');
    relationshipBadge = document.getElementById('relationship-badge');
    searchResults = document.getElementById('search-results');
    searchButton = document.getElementById('search-button');
    clearSearchButton = document.getElementById('clear-search');
    
    // Tab elements
    treeTab = document.getElementById('tree-tab');
    detailsTab = document.getElementById('details-tab');
    treePane = document.getElementById('tree-pane');
    detailsPane = document.getElementById('details-pane');
}

// Configurar event listeners
function initializeEventListeners() {
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const hasText = this.value.trim().length > 0;
            clearSearchButton.classList.toggle('active', hasText);
            
            if (this.value.trim().length >= 2) {
                performSearch();
            } else {
                hideSearchResults();
                // Remover destaque da pessoa pesquisada anterior
                if (lastSearchResult) {
                    removeSearchHighlight();
                }
            }
        });
        
        searchInput.addEventListener('keyup', function(event) {
            if (event.key === 'Enter') {
                performSearch();
            }
        });
        
        // Fechar resultados ao clicar fora
        document.addEventListener('click', function(event) {
            if (!searchResults.contains(event.target) && 
                event.target !== searchInput && 
                event.target !== searchButton && 
                !searchButton.contains(event.target)) {
                hideSearchResults();
            }
        });
        
        // Prevenir comportamento padrão do formulário
        searchInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
            }
        });
    }
    
    if (searchButton) {
        searchButton.addEventListener('click', performSearch);
    }
    
    if (clearSearchButton) {
        clearSearchButton.addEventListener('click', function() {
            searchInput.value = '';
            this.classList.remove('active');
            hideSearchResults();
            searchInput.focus();
            // Remover destaque da pessoa pesquisada
            removeSearchHighlight();
        });
    }
    
    // Tab switching
    if (treeTab) treeTab.addEventListener('click', () => switchTab('tree'));
    if (detailsTab) detailsTab.addEventListener('click', () => switchTab('details'));
    
    // Ajustar layout ao redimensionar
    window.addEventListener('resize', function() {
        checkOrientation();
        adjustLayoutForScreen();
    });
    
    // Melhorar scroll no mobile
    if ('ontouchstart' in window) {
        document.addEventListener('touchmove', function(e) {
            if (e.target.classList.contains('tree-container') || 
                e.target.classList.contains('details-content-wrapper') ||
                e.target.classList.contains('person-list')) {
                // Permitir scroll apenas nos containers apropriados
                return;
            }
        }, { passive: true });
    }
}

// Switch between tabs
function switchTab(tabName) {
    // Update tab buttons
    treeTab.classList.remove('active');
    detailsTab.classList.remove('active');
    
    // Hide all panes
    treePane.classList.remove('active');
    detailsPane.classList.remove('active');
    
    // Show selected tab
    if (tabName === 'tree') {
        treeTab.classList.add('active');
        treePane.classList.add('active');
        
        // Ajustar altura da árvore quando ativa
        setTimeout(() => {
            adjustLayoutForScreen();
        }, 100);
    } else if (tabName === 'details') {
        detailsTab.classList.add('active');
        detailsPane.classList.add('active');
        
        // Ajustar altura dos detalhes quando ativa
        setTimeout(() => {
            if (window.innerWidth <= 767) {
                const detailsWrapper = document.querySelector('.details-content-wrapper');
                if (detailsWrapper) {
                    const availableHeight = window.innerHeight - 250;
                    detailsWrapper.style.maxHeight = Math.max(300, availableHeight) + 'px';
                }
            }
        }, 100);
    }
}

// Hide search results
function hideSearchResults() {
    searchResults.classList.remove('active');
}

// Perform search and show results
function performSearch() {
    const searchTerm = searchInput.value.trim();
    if (!searchTerm) {
        hideSearchResults();
        return;
    }
    
    // Normalizar o termo de busca
    const normalizedSearchTerm = normalizeSearchText(searchTerm).replace(/\s+/g, ' ');
    
    // Procurar pessoas
    const foundPersons = persons.filter(person => {
        const normalizedName = normalizeSearchText(person.nome || '');
        const normalizedSurname = normalizeSearchText(person.sobrenome || '');
        
        // Busca exata em qualquer campo individual
        if (normalizedName.includes(normalizedSearchTerm) ||
            normalizedSurname.includes(normalizedSearchTerm)) {
            return true;
        }
        
        // Busca combinada: nome + sobrenome
        const fullNameCombined = `${normalizedName} ${normalizedSurname}`.trim();
        if (fullNameCombined.includes(normalizedSearchTerm)) {
            return true;
        }
        
        // Busca por partes do nome
        const searchParts = normalizedSearchTerm.split(' ');
        if (searchParts.length >= 2) {
            let matchesAllParts = true;
            
            for (const part of searchParts) {
                if (part.length < 2) continue;
                
                const matchesName = normalizedName.includes(part);
                const matchesSurname = normalizedSurname.includes(part);
                const matchesFullName = fullNameCombined.includes(part);
                
                if (!matchesName && !matchesSurname && !matchesFullName) {
                    matchesAllParts = false;
                    break;
                }
            }
            
            if (matchesAllParts) return true;
        }
        
        return false;
    });
    
    // Ordenar resultados por relevância
    const sortedResults = sortSearchResults(foundPersons, searchTerm, normalizedSearchTerm);
    
    if (sortedResults.length > 0) {
        showSearchResults(sortedResults, searchTerm);
        
        // Armazenar o primeiro resultado da pesquisa
        lastSearchResult = sortedResults[0];
        
        // Destacar a pessoa pesquisada na lista e na árvore
        highlightSearchedPerson(sortedResults[0].id);
    } else {
        showSearchResults([], searchTerm);
        // Remover destaque da pessoa pesquisada anterior
        removeSearchHighlight();
        lastSearchResult = null;
    }
    
    // Mostrar resultados automaticamente em mobile
    if (window.innerWidth <= 767) {
        searchResults.classList.add('active');
    }
}

// Destacar pessoa pesquisada
function highlightSearchedPerson(personId) {
    // Remover destaque anterior
    removeSearchHighlight();
    
    // Destacar na lista de pessoas
    const personItem = document.querySelector(`.person-item[data-id="${personId}"]`);
    if (personItem) {
        personItem.classList.add('search-highlight');
        
        // Scroll para a pessoa destacada na lista
        personItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    // Se a pessoa estiver na árvore atual, destacar também
    const treeNode = document.querySelector(`.tree-node[data-id="${personId}"]`);
    if (treeNode) {
        treeNode.classList.add('search-highlight');
    }
    
    // Atualizar badge de relação se for a pessoa selecionada
    if (selectedPerson && selectedPerson.id === personId && relationshipBadge) {
        relationshipBadge.textContent = 'Pesquisado/Selecionado';
        relationshipBadge.style.backgroundColor = '#f1c40f';
    }
}

// Remover destaque da pessoa pesquisada
function removeSearchHighlight() {
    // Remover da lista
    document.querySelectorAll('.person-item.search-highlight').forEach(item => {
        item.classList.remove('search-highlight');
    });
    
    // Remover da árvore
    document.querySelectorAll('.tree-node.search-highlight').forEach(node => {
        node.classList.remove('search-highlight');
    });
    
    // Restaurar badge se for a pessoa selecionada
    if (selectedPerson && relationshipBadge) {
        relationshipBadge.textContent = 'Selecionado';
        relationshipBadge.style.backgroundColor = '#3498db';
    }
}

// Ordenar resultados por relevância
function sortSearchResults(results, originalSearchTerm, normalizedSearchTerm) {
    return results.sort((a, b) => {
        const aName = normalizeSearchText(a.nome || '');
        const aSurname = normalizeSearchText(a.sobrenome || '');
        const bName = normalizeSearchText(b.nome || '');
        const bSurname = normalizeSearchText(b.sobrenome || '');
        
        const aFullName = `${aName} ${aSurname}`;
        const bFullName = `${bName} ${bSurname}`;
        
        // Pontuação de relevância
        let aScore = 0;
        let bScore = 0;
        
        // 1. Correspondência exata no nome ou sobrenome
        if (aName === normalizedSearchTerm || aSurname === normalizedSearchTerm) aScore += 10;
        if (bName === normalizedSearchTerm || bSurname === normalizedSearchTerm) bScore += 10;
        
        // 2. Correspondência exata no nome completo
        if (aFullName.trim() === normalizedSearchTerm) aScore += 15;
        if (bFullName.trim() === normalizedSearchTerm) bScore += 15;
        
        // 3. Nome começa com o termo de busca
        if (aName.startsWith(normalizedSearchTerm)) aScore += 5;
        if (bName.startsWith(normalizedSearchTerm)) bScore += 5;
        
        // 4. Termo aparece no início do nome
        if (aName.indexOf(normalizedSearchTerm) === 0) aScore += 4;
        if (bName.indexOf(normalizedSearchTerm) === 0) bScore += 4;
        
        // 5. Termo aparece no início do sobrenome
        if (aSurname.indexOf(normalizedSearchTerm) === 0) aScore += 4;
        if (bSurname.indexOf(normalizedSearchTerm) === 0) bScore += 4;
        
        // 6. Correspondência parcial
        if (aName.includes(normalizedSearchTerm)) aScore += 3;
        if (bName.includes(normalizedSearchTerm)) bScore += 3;
        
        if (aSurname.includes(normalizedSearchTerm)) aScore += 3;
        if (bSurname.includes(normalizedSearchTerm)) bScore += 3;
        
        // 7. Ordenar alfabeticamente como desempate
        if (aScore === bScore) {
            return aFullName.localeCompare(bFullName);
        }
        
        return bScore - aScore;
    });
}

// Destacar texto nos resultados
function highlightText(text, searchTerm) {
    if (!searchTerm || !text) return text;
    
    const normalizedText = normalizeSearchText(text);
    const normalizedSearchTerm = normalizeSearchText(searchTerm);
    
    if (!normalizedText.includes(normalizedSearchTerm)) return text;
    
    // Encontrar posição onde o termo começa
    let startIndex = 0;
    let found = false;
    
    for (let i = 0; i <= text.length - searchTerm.length; i++) {
        const substring = text.substring(i, i + searchTerm.length);
        if (normalizeSearchText(substring) === normalizedSearchTerm) {
            startIndex = i;
            found = true;
            break;
        }
    }
    
    if (!found) return text;
    
    const endIndex = startIndex + searchTerm.length;
    return text.substring(0, startIndex) + 
           '<span class="highlight">' + text.substring(startIndex, endIndex) + '</span>' + 
           text.substring(endIndex);
}

// Show search results in dropdown
function showSearchResults(results, searchTerm) {
    searchResults.innerHTML = '';
    
    if (results.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.innerHTML = `<i class="fas fa-search"></i><div>Nenhuma pessoa encontrada para "${searchTerm}"</div>`;
        searchResults.appendChild(noResults);
    } else {
        // Adicionar contador de resultados
        const countDiv = document.createElement('div');
        countDiv.className = 'search-count';
        countDiv.textContent = `${results.length} ${results.length === 1 ? 'pessoa encontrada' : 'pessoas encontradas'}`;
        searchResults.appendChild(countDiv);
        
        results.forEach(person => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            
            const infoDiv = document.createElement('div');
            infoDiv.className = 'search-result-info';
            
            const nameDiv = document.createElement('div');
            nameDiv.className = 'search-result-name';
            nameDiv.innerHTML = highlightText(person.nome || 'Nome desconhecido', searchTerm);
            
            const surnameDiv = document.createElement('div');
            surnameDiv.className = 'search-result-surname';
            surnameDiv.innerHTML = highlightText(person.sobrenome || '', searchTerm);
            
            infoDiv.appendChild(nameDiv);
            infoDiv.appendChild(surnameDiv);
            
            const detailsDiv = document.createElement('div');
            detailsDiv.className = 'search-result-details';
            
            const birthSpan = document.createElement('span');
            birthSpan.className = 'search-result-birth';
            birthSpan.textContent = `Nasc: ${extractYear(person.data_nascimento)}`;
            
            detailsDiv.appendChild(birthSpan);
            
            resultItem.appendChild(infoDiv);
            resultItem.appendChild(detailsDiv);
            
            resultItem.addEventListener('click', () => {
                selectPerson(person.id);
                searchInput.value = '';
                clearSearchButton.classList.remove('active');
                hideSearchResults();
                
                // Destacar a pessoa pesquisada
                highlightSearchedPerson(person.id);
                
                // Fechar teclado virtual em mobile após seleção
                if (window.innerWidth <= 767) {
                    searchInput.blur();
                }
            });
            
            searchResults.appendChild(resultItem);
        });
    }
    
    searchResults.classList.add('active');
}

// Carregar todos os ficheiros automaticamente
async function loadAllFiles() {
    // Atualizar mensagens
    if (personList) personList.innerHTML = '<li class="empty-message"><i class="fas fa-spinner fa-spin"></i><div>A carregar dados...</div></li>';
    if (treeContainer) treeContainer.innerHTML = '<div class="empty-message"><i class="fas fa-tree"></i><div>A carregar dados...</div></div>';
    hideSearchResults();
    
    try {
        // Carregar todos os ficheiros
        const [placesData, personsData, marriagesData, relationshipsData] = await Promise.all([
            loadFile('places.json'),
            loadFile('persons.json'),
            loadFile('marriages.json'),
            loadFile('relationships.json')
        ]);
        
        // Atualizar dados
        places = placesData;
        persons = personsData;
        marriages = marriagesData;
        relationships = relationshipsData;
        
        // Criar mapeamentos
        createMaps();
        
        // Atualizar interface
        updatePersonList();
        
        showMessage('Dados carregados com sucesso!', 'success');
        
        // Selecionar primeira pessoa
        if (persons.length > 0) {
            setTimeout(() => selectPerson(persons[0].id), 500);
        }
        
    } catch (error) {
        console.error('Erro ao carregar ficheiros:', error);
        showMessage('Erro ao carregar ficheiros. Verifique os ficheiros JSON.', 'error');
    }
}

// Carregar ficheiro
async function loadFile(filename) {
    const response = await fetch(filename);
    if (!response.ok) throw new Error(`${filename} não encontrado`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error(`${filename} não é um array válido`);
    return data;
}

// Criar mapeamentos
function createMaps() {
    // Mapear lugares
    placesMap = {};
    places.forEach(place => placesMap[place.id] = place);
    
    // Mapear pessoas
    personsMap = {};
    persons.forEach(person => {
        personsMap[person.id] = person;
        if (person.lugar_nascimento && placesMap[person.lugar_nascimento]) {
            person.lugar_nascimento_nome = placesMap[person.lugar_nascimento].nome;
        }
    });
    
    // Mapear casamentos
    marriagesMap = {};
    marriages.forEach(marriage => marriagesMap[marriage.id] = marriage);
    
    // Mapear filhos por família
    childrenMap = {};
    relationships.forEach(rel => {
        if (!childrenMap[rel.familia]) childrenMap[rel.familia] = [];
        childrenMap[rel.familia].push(rel.filho);
    });
    
    // Mapear pais por pessoa
    parentsMap = {};
    relationships.forEach(rel => {
        const marriage = marriagesMap[rel.familia];
        if (marriage) {
            parentsMap[rel.filho] = {
                father: marriage.marido,
                mother: marriage.esposa
            };
        }
    });
}

// Atualizar lista de pessoas
function updatePersonList() {
    if (!personList) return;
    
    personList.innerHTML = '';
    
    if (persons.length === 0) {
        personList.innerHTML = '<li class="empty-message"><i class="fas fa-users"></i><div>Nenhuma pessoa carregada</div></li>';
        return;
    }
    
    // Ordenar por nome
    const sortedPersons = [...persons].sort((a, b) => {
        const nameA = (a.nome || '').toLowerCase();
        const nameB = (b.nome || '').toLowerCase();
        return nameA.localeCompare(nameB);
    });
    
    // Adicionar à lista
    sortedPersons.forEach(person => {
        const li = document.createElement('li');
        li.className = 'person-item';
        li.dataset.id = person.id;
        
        const nameContainer = document.createElement('div');
        nameContainer.className = 'person-name-container';
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'person-name';
        const fullName = person.nome || 'Nome desconhecido';
        if (fullName.length > 15) {
            nameDiv.textContent = fullName.substring(0, 15) + '...';
        } else {
            nameDiv.textContent = fullName;
        }
        
        const genderDiv = document.createElement('div');
        genderDiv.className = 'person-gender';
        genderDiv.textContent = person.sexo === 'masculino' ? '♂' : person.sexo === 'feminino' ? '♀' : '?';
        
        nameContainer.appendChild(nameDiv);
        nameContainer.appendChild(genderDiv);
        
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'person-details';
        
        const surnameDiv = document.createElement('div');
        surnameDiv.className = 'person-surname';
        const fullSurname = person.sobrenome || '';
        if (fullSurname.length > 20) {
            surnameDiv.textContent = fullSurname.substring(0, 20) + '...';
        } else {
            surnameDiv.textContent = fullSurname;
        }
        
        const metaDiv = document.createElement('div');
        metaDiv.className = 'person-meta';
        
        const birthDiv = document.createElement('div');
        birthDiv.className = 'person-birth';
        birthDiv.textContent = `Nasc: ${extractYear(person.data_nascimento)}`;
        
        const idDiv = document.createElement('div');
        idDiv.className = 'person-id';
        idDiv.textContent = person.id;
        
        metaDiv.appendChild(birthDiv);
        metaDiv.appendChild(idDiv);
        
        detailsDiv.appendChild(surnameDiv);
        detailsDiv.appendChild(metaDiv);
        
        li.appendChild(nameContainer);
        li.appendChild(detailsDiv);
        
        li.addEventListener('click', () => selectPerson(person.id));
        
        personList.appendChild(li);
    });
}

// Extrair ano
function extractYear(dateString) {
    if (!dateString) return '?';
    const yearMatch = dateString.match(/\b\d{4}\b/);
    return yearMatch ? yearMatch[0] : '?';
}

// Selecionar pessoa
function selectPerson(personId) {
    selectedPerson = personsMap[personId];
    
    // Atualizar lista
    document.querySelectorAll('.person-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.id === personId) item.classList.add('active');
    });
    
    // Atualizar badge de relação
    if (relationshipBadge) {
        // Verificar se é a mesma pessoa que foi pesquisada
        if (lastSearchResult && lastSearchResult.id === personId) {
            relationshipBadge.textContent = 'Pesquisado/Selecionado';
            relationshipBadge.style.backgroundColor = '#f1c40f';
        } else {
            relationshipBadge.textContent = 'Selecionado';
            relationshipBadge.style.backgroundColor = '#3498db';
        }
    }
    
    // Gerar árvore baseado na orientação
    if (window.innerWidth <= 767 && isLandscape) {
        // Mobile landscape: layout especial para landscape
        generateFamilyTreeMobileLandscape(personId);
    } else if (window.innerWidth <= 767) {
        // Mobile portrait: mostrar apenas pais e filhos
        generateFamilyTreeMobile(personId);
    } else {
        // Desktop: mostrar com avós
        generateFamilyTreeWithGrandparents(personId);
    }
    
    // Mostrar detalhes
    showPersonDetails(personId);
    
    // Switch to tree tab by default when selecting a person
    switchTab('tree');
    
    // Scroll para o item selecionado na lista
    const activeItem = document.querySelector(`.person-item[data-id="${personId}"]`);
    if (activeItem && personList) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Gerar árvore genealógica para mobile portrait (apenas pais e filhos)
function generateFamilyTreeMobile(personId) {
    if (!treeContainer) return;
    
    treeContainer.innerHTML = '';
    
    const mainPerson = personsMap[personId];
    if (!mainPerson) {
        treeContainer.innerHTML = '<div class="empty-message"><i class="fas fa-user-times"></i><div>Pessoa não encontrada</div></div>';
        return;
    }
    
    // Obter dimensões do container
    const containerWidth = treeContainer.clientWidth;
    const isMobile = window.innerWidth <= 767;
    
    // Ajustar tamanho dos nós para mobile
    let regularNodeWidth = 95;
    let regularNodeHeight = 55;
    let horizontalSpacing = 105;
    let verticalSpacing = 100;
    
    // Coletar pessoas para mostrar
    const allPersons = new Set([personId]);
    const positions = new Map();
    
    // Adicionar pais
    const parents = parentsMap[personId];
    
    // Adicionar filhos
    const children = findChildren(personId);
    children.forEach(childId => {
        allPersons.add(childId);
    });
    
    // Adicionar cônjuge(s)
    const spouses = findSpouses(personId);
    spouses.forEach(spouseId => allPersons.add(spouseId));
    
    // Organizar por gerações
    const generations = [];
    
    // Geração -1: Pais (se existirem)
    const parentGeneration = [];
    if (parents) {
        if (parents.father) parentGeneration.push(parents.father);
        if (parents.mother) parentGeneration.push(parents.mother);
    }
    
    // Geração 0: Pessoa principal e cônjuges
    const mainGeneration = [personId];
    spouses.forEach(spouseId => mainGeneration.push(spouseId));
    
    // Geração 1: Filhos
    const childrenGeneration = children;
    
    // Adicionar gerações
    if (parentGeneration.length > 0) {
        generations.push({depth: -1, persons: parentGeneration});
    }
    generations.push({depth: 0, persons: mainGeneration});
    generations.push({depth: 1, persons: childrenGeneration});
    
    // Encontrar geração com mais pessoas
    let maxNodesInRow = 0;
    generations.forEach(gen => {
        if (gen.persons.length > maxNodesInRow) maxNodesInRow = gen.persons.length;
    });
    
    // Calcular posição inicial para centralizar
    const totalWidthNeeded = maxNodesInRow * horizontalSpacing;
    const startX = Math.max(20, (containerWidth - totalWidthNeeded) / 2);
    
    // POSIÇÃO Y COMEÇA MAIS ALTO PARA PORTRAIT
    const startY = 20;
    
    // Posicionar nós
    generations.forEach((gen, genIndex) => {
        const y = startY + genIndex * verticalSpacing;
        const genWidth = gen.persons.length * horizontalSpacing;
        const startGenX = startX + (totalWidthNeeded - genWidth) / 2;
        
        gen.persons.forEach((personId, index) => {
            const person = personsMap[personId];
            if (!person) return;
            
            const x = startGenX + index * horizontalSpacing;
            positions.set(personId, { x, y });
            
            // Determinar relação com a pessoa selecionada
            const relationship = getRelationshipMobile(personId, personId === personId ? 'self' : personId);
            
            // Criar nó
            const node = createPersonNode(person, x, y, regularNodeWidth, regularNodeHeight, relationship, false, true);
            
            if (personId === selectedPerson.id) {
                node.classList.add('selected');
            }
            
            // Adicionar destaque se for a pessoa pesquisada
            if (lastSearchResult && lastSearchResult.id === personId) {
                node.classList.add('search-highlight');
            }
            
            treeContainer.appendChild(node);
        });
    });
    
    // Desenhar conexões entre gerações
    for (let i = 0; i < generations.length - 1; i++) {
        const currentGen = generations[i];
        const nextGen = generations[i + 1];
        
        currentGen.persons.forEach(parentId => {
            const parent = personsMap[parentId];
            if (!parent) return;
            
            const parentPos = positions.get(parentId);
            if (!parentPos) return;
            
            // Encontrar filhos desta pessoa na próxima geração
            const childrenIds = findChildren(parentId);
            
            childrenIds.forEach(childId => {
                if (nextGen.persons.includes(childId)) {
                    const childPos = positions.get(childId);
                    if (childPos) {
                        drawConnection(parentPos, childPos, regularNodeWidth, regularNodeHeight);
                    }
                }
            });
        });
    }
    
    // Desenhar conexões entre cônjuges
    mainGeneration.forEach(personId1 => {
        mainGeneration.forEach(personId2 => {
            if (personId1 !== personId2 && areSpouses(personId1, personId2)) {
                const pos1 = positions.get(personId1);
                const pos2 = positions.get(personId2);
                if (pos1 && pos2) {
                    drawSpouseConnection(pos1, pos2, regularNodeWidth);
                }
            }
        });
    });
    
    // Ajustar altura do container
    if (generations.length > 0) {
        const lastGen = generations[generations.length - 1];
        const lastY = startY + (generations.length - 1) * verticalSpacing + regularNodeHeight + 40;
        const minHeight = 400;
        treeContainer.style.minHeight = Math.max(minHeight, lastY) + 'px';
        
        if (isMobile) {
            treeContainer.style.maxHeight = 'none';
            if (lastY > 400) {
                treeContainer.style.minHeight = lastY + 50 + 'px';
            }
        }
    }
    
    // Scroll para a pessoa selecionada
    setTimeout(() => {
        const selectedNode = treeContainer.querySelector('.tree-node.selected');
        if (selectedNode) {
            selectedNode.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
    }, 100);
}

// Gerar árvore genealógica para mobile landscape
function generateFamilyTreeMobileLandscape(personId) {
    if (!treeContainer) return;
    
    treeContainer.innerHTML = '';
    
    const mainPerson = personsMap[personId];
    if (!mainPerson) {
        treeContainer.innerHTML = '<div class="empty-message"><i class="fas fa-user-times"></i><div>Pessoa não encontrada</div></div>';
        return;
    }
    
    // Obter dimensões do container (landscape tem mais largura)
    const containerWidth = treeContainer.clientWidth;
    const containerHeight = treeContainer.clientHeight;
    const isLandscapeMode = true;
    
    // Ajustar tamanho dos nós para landscape (maiores porque temos mais espaço)
    let regularNodeWidth = 110;
    let regularNodeHeight = 65;
    let horizontalSpacing = 130;
    let verticalSpacing = 90; // Menos espaçamento vertical para caber melhor
    
    // Coletar pessoas para mostrar
    const allPersons = new Set([personId]);
    const positions = new Map();
    
    // Adicionar pais
    const parents = parentsMap[personId];
    
    // Adicionar filhos
    const children = findChildren(personId);
    children.forEach(childId => {
        allPersons.add(childId);
    });
    
    // Adicionar cônjuge(s)
    const spouses = findSpouses(personId);
    spouses.forEach(spouseId => allPersons.add(spouseId));
    
    // Organizar por gerações
    const generations = [];
    
    // Geração -1: Pais (se existirem)
    const parentGeneration = [];
    if (parents) {
        if (parents.father) parentGeneration.push(parents.father);
        if (parents.mother) parentGeneration.push(parents.mother);
    }
    
    // Geração 0: Pessoa principal e cônjuges
    const mainGeneration = [personId];
    spouses.forEach(spouseId => mainGeneration.push(spouseId));
    
    // Geração 1: Filhos
    const childrenGeneration = children;
    
    // Adicionar gerações
    if (parentGeneration.length > 0) {
        generations.push({depth: -1, persons: parentGeneration});
    }
    generations.push({depth: 0, persons: mainGeneration});
    generations.push({depth: 1, persons: childrenGeneration});
    
    // Encontrar geração com mais pessoas
    let maxNodesInRow = 0;
    generations.forEach(gen => {
        if (gen.persons.length > maxNodesInRow) maxNodesInRow = gen.persons.length;
    });
    
    // Calcular posição inicial para centralizar
    const totalWidthNeeded = maxNodesInRow * horizontalSpacing;
    const startX = Math.max(20, (containerWidth - totalWidthNeeded) / 2);
    
    // POSIÇÃO Y COMEÇA MAIS BAIXO PARA LANDSCAPE (mais espaço no topo)
    const startY = 30;
    
    // Verificar se há espaço vertical suficiente
    const neededHeight = startY + (generations.length * verticalSpacing) + regularNodeHeight + 40;
    if (neededHeight > containerHeight && generations.length > 2) {
        // Ajustar espaçamento vertical se necessário
        verticalSpacing = Math.max(70, (containerHeight - startY - regularNodeHeight - 40) / generations.length);
    }
    
    // Posicionar nós
    generations.forEach((gen, genIndex) => {
        const y = startY + genIndex * verticalSpacing;
        const genWidth = gen.persons.length * horizontalSpacing;
        const startGenX = startX + (totalWidthNeeded - genWidth) / 2;
        
        gen.persons.forEach((personId, index) => {
            const person = personsMap[personId];
            if (!person) return;
            
            const x = startGenX + index * horizontalSpacing;
            positions.set(personId, { x, y });
            
            // Determinar relação com a pessoa selecionada
            const relationship = getRelationshipMobile(personId, personId === personId ? 'self' : personId);
            
            // Criar nó
            const node = createPersonNode(person, x, y, regularNodeWidth, regularNodeHeight, relationship, false, isLandscapeMode);
            
            if (personId === selectedPerson.id) {
                node.classList.add('selected');
            }
            
            // Adicionar destaque se for a pessoa pesquisada
            if (lastSearchResult && lastSearchResult.id === personId) {
                node.classList.add('search-highlight');
            }
            
            treeContainer.appendChild(node);
        });
    });
    
    // Desenhar conexões entre gerações
    for (let i = 0; i < generations.length - 1; i++) {
        const currentGen = generations[i];
        const nextGen = generations[i + 1];
        
        currentGen.persons.forEach(parentId => {
            const parent = personsMap[parentId];
            if (!parent) return;
            
            const parentPos = positions.get(parentId);
            if (!parentPos) return;
            
            // Encontrar filhos desta pessoa na próxima geração
            const childrenIds = findChildren(parentId);
            
            childrenIds.forEach(childId => {
                if (nextGen.persons.includes(childId)) {
                    const childPos = positions.get(childId);
                    if (childPos) {
                        drawConnection(parentPos, childPos, regularNodeWidth, regularNodeHeight);
                    }
                }
            });
        });
    }
    
    // Desenhar conexões entre cônjuges
    mainGeneration.forEach(personId1 => {
        mainGeneration.forEach(personId2 => {
            if (personId1 !== personId2 && areSpouses(personId1, personId2)) {
                const pos1 = positions.get(personId1);
                const pos2 = positions.get(personId2);
                if (pos1 && pos2) {
                    drawSpouseConnection(pos1, pos2, regularNodeWidth);
                }
            }
        });
    });
    
    // Ajustar altura do container se necessário
    if (generations.length > 0) {
        const lastGen = generations[generations.length - 1];
        const lastY = startY + (generations.length - 1) * verticalSpacing + regularNodeHeight + 40;
        
        // Se precisar de mais altura, ajustar
        if (lastY > containerHeight) {
            treeContainer.style.minHeight = lastY + 'px';
        }
    }
    
    // Scroll para a pessoa selecionada
    setTimeout(() => {
        const selectedNode = treeContainer.querySelector('.tree-node.selected');
        if (selectedNode) {
            selectedNode.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
    }, 100);
}

// Determinar relação para mobile
function getRelationshipMobile(personId, relativeToId) {
    if (personId === relativeToId) return 'Eu';
    
    const relativeTo = selectedPerson.id;
    
    // Pai/Mãe
    const parents = parentsMap[relativeTo];
    if (parents && (parents.father === personId || parents.mother === personId)) {
        return parents.father === personId ? 'Pai' : 'Mãe';
    }
    
    // Filhos
    const children = findChildren(relativeTo);
    if (children.includes(personId)) {
        const person = personsMap[personId];
        return person && person.sexo === 'masculino' ? 'Filho' : 'Filha';
    }
    
    // Cônjuge
    if (areSpouses(personId, relativeTo)) {
        const person = personsMap[personId];
        return person && person.sexo === 'masculino' ? 'Marido' : 'Esposa';
    }
    
    return 'Selecionado';
}

// Gerar árvore genealógica com avós para desktop - FIXED FOR GRANDPARENTS VISIBILITY
function generateFamilyTreeWithGrandparents(personId) {
    if (!treeContainer) return;
    
    treeContainer.innerHTML = '';
    
    const mainPerson = personsMap[personId];
    if (!mainPerson) {
        treeContainer.innerHTML = '<div class="empty-message"><i class="fas fa-user-times"></i><div>Pessoa não encontrada</div></div>';
        return;
    }
    
    // Obter dimensões reais do container (considerando padding)
    const containerWidth = treeContainer.clientWidth;
    const isDesktop = window.innerWidth >= 768;
    const isLargeDesktop = window.innerWidth >= 1200;
    
    // Ajustar tamanho dos nós
    let regularNodeWidth, regularNodeHeight, grandparentNodeWidth, grandparentNodeHeight;
    let horizontalSpacing, verticalSpacing;
    
    if (isLargeDesktop) {
        regularNodeWidth = 150;
        regularNodeHeight = 80;
        grandparentNodeWidth = 130;
        grandparentNodeHeight = 70;
        horizontalSpacing = 170;
        verticalSpacing = 130;
    } else {
        regularNodeWidth = 140;
        regularNodeHeight = 75;
        grandparentNodeWidth = 120;
        grandparentNodeHeight = 65;
        horizontalSpacing = 160;
        verticalSpacing = 120;
    }
    
    // Coletar pessoas para mostrar
    const allPersons = new Set([personId]);
    const positions = new Map();
    
    // Adicionar pais
    const parents = parentsMap[personId];
    let paternalGrandparents = null;
    let maternalGrandparents = null;
    
    if (parents) {
        if (parents.father) {
            allPersons.add(parents.father);
            // Adicionar avós paternos
            paternalGrandparents = parentsMap[parents.father];
            if (paternalGrandparents) {
                if (paternalGrandparents.father) allPersons.add(paternalGrandparents.father);
                if (paternalGrandparents.mother) allPersons.add(paternalGrandparents.mother);
            }
        }
        if (parents.mother) {
            allPersons.add(parents.mother);
            // Adicionar avós maternos
            maternalGrandparents = parentsMap[parents.mother];
            if (maternalGrandparents) {
                if (maternalGrandparents.father) allPersons.add(maternalGrandparents.father);
                if (maternalGrandparents.mother) allPersons.add(maternalGrandparents.mother);
            }
        }
    }
    
    // Adicionar filhos
    const children = findChildren(personId);
    children.forEach(childId => {
        allPersons.add(childId);
    });
    
    // Adicionar cônjuge(s)
    const spouses = findSpouses(personId);
    spouses.forEach(spouseId => allPersons.add(spouseId));
    
    // Organizar por gerações
    const generations = [];
    
    // Geração -2: Avós (se existirem)
    const grandparentGeneration = [];
    if (paternalGrandparents) {
        if (paternalGrandparents.father) grandparentGeneration.push(paternalGrandparents.father);
        if (paternalGrandparents.mother) grandparentGeneration.push(paternalGrandparents.mother);
    }
    if (maternalGrandparents) {
        if (maternalGrandparents.father) grandparentGeneration.push(maternalGrandparents.father);
        if (maternalGrandparents.mother) grandparentGeneration.push(maternalGrandparents.mother);
    }
    
    // Geração -1: Pais (se existirem)
    const parentGeneration = [];
    if (parents) {
        if (parents.father) parentGeneration.push(parents.father);
        if (parents.mother) parentGeneration.push(parents.mother);
    }
    
    // Geração 0: Pessoa principal e cônjuges
    const mainGeneration = [personId];
    spouses.forEach(spouseId => mainGeneration.push(spouseId));
    
    // Geração 1: Filhos
    const childrenGeneration = children;
    
    // Adicionar gerações
    if (grandparentGeneration.length > 0) {
        generations.push({depth: -2, persons: grandparentGeneration, isGrandparent: true});
    }
    if (parentGeneration.length > 0) {
        generations.push({depth: -1, persons: parentGeneration});
    }
    generations.push({depth: 0, persons: mainGeneration});
    generations.push({depth: 1, persons: childrenGeneration});
    
    // Encontrar geração com mais pessoas
    let maxNodesInRow = 0;
    generations.forEach(gen => {
        if (gen.persons.length > maxNodesInRow) maxNodesInRow = gen.persons.length;
    });
    
    // Calcular posição inicial para centralizar
    const totalWidthNeeded = maxNodesInRow * horizontalSpacing;
    const startX = Math.max(20, (containerWidth - totalWidthNeeded) / 2);
    
    // POSIÇÃO INICIAL Y COMEÇA MAIS BAIXO PARA OS AVÓS NÃO FICAREM CORTADOS
    const startY = 40; // Aumentado de 20 para 40 para dar mais espaço no topo
    
    // Posicionar nós
    generations.forEach((gen, genIndex) => {
        const y = startY + genIndex * verticalSpacing;
        const genWidth = gen.persons.length * horizontalSpacing;
        const startGenX = startX + (totalWidthNeeded - genWidth) / 2;
        
        gen.persons.forEach((personId, index) => {
            const person = personsMap[personId];
            if (!person) return;
            
            const x = startGenX + index * horizontalSpacing;
            positions.set(personId, { x, y });
            
            // Determinar relação com a pessoa selecionada
            const relationship = getRelationship(personId, personId === personId ? 'self' : personId);
            
            // Criar nó
            let node;
            if (gen.isGrandparent) {
                node = createPersonNode(person, x, y, grandparentNodeWidth, grandparentNodeHeight, relationship, isDesktop, false);
                node.classList.add('grandparent');
            } else {
                node = createPersonNode(person, x, y, regularNodeWidth, regularNodeHeight, relationship, isDesktop, false);
            }
            
            if (personId === selectedPerson.id) {
                node.classList.add('selected');
            }
            
            // Adicionar destaque se for a pessoa pesquisada
            if (lastSearchResult && lastSearchResult.id === personId) {
                node.classList.add('search-highlight');
            }
            
            treeContainer.appendChild(node);
        });
    });
    
    // Desenhar conexões
    for (let i = 0; i < generations.length - 1; i++) {
        const currentGen = generations[i];
        const nextGen = generations[i + 1];
        
        currentGen.persons.forEach(parentId => {
            const parent = personsMap[parentId];
            if (!parent) return;
            
            const parentPos = positions.get(parentId);
            if (!parentPos) return;
            
            const childrenIds = findChildren(parentId);
            
            childrenIds.forEach(childId => {
                if (nextGen.persons.includes(childId)) {
                    const childPos = positions.get(childId);
                    if (childPos) {
                        const parentNodeHeight = currentGen.isGrandparent ? grandparentNodeHeight : regularNodeHeight;
                        const childNodeHeight = nextGen.isGrandparent ? grandparentNodeHeight : regularNodeHeight;
                        drawConnection(parentPos, childPos, regularNodeWidth, parentNodeHeight);
                    }
                }
            });
        });
    }
    
    // Desenhar conexões entre cônjuges
    mainGeneration.forEach(personId1 => {
        mainGeneration.forEach(personId2 => {
            if (personId1 !== personId2 && areSpouses(personId1, personId2)) {
                const pos1 = positions.get(personId1);
                const pos2 = positions.get(personId2);
                if (pos1 && pos2) {
                    drawSpouseConnection(pos1, pos2, regularNodeWidth);
                }
            }
        });
    });
    
    // Ajustar altura do container para garantir que tudo seja visível
    if (generations.length > 0) {
        const lastGen = generations[generations.length - 1];
        const lastY = startY + (generations.length - 1) * verticalSpacing + regularNodeHeight + 60; // Aumentado padding inferior
        const minHeight = isLargeDesktop ? 600 : 500;
        
        // Garantir altura mínima
        const neededHeight = Math.max(minHeight, lastY);
        treeContainer.style.minHeight = neededHeight + 'px';
        
        // Scroll para a pessoa selecionada
        setTimeout(() => {
            const selectedNode = treeContainer.querySelector('.tree-node.selected');
            if (selectedNode) {
                // Primeiro, garantir que o container tenha scroll se necessário
                if (treeContainer.scrollHeight > treeContainer.clientHeight) {
                    treeContainer.style.overflow = 'auto';
                }
                
                // Calcular posição para scroll
                const nodeRect = selectedNode.getBoundingClientRect();
                const containerRect = treeContainer.getBoundingClientRect();
                
                // Se o nó selecionado não estiver visível, scroll para ele
                if (nodeRect.top < containerRect.top || nodeRect.bottom > containerRect.bottom) {
                    selectedNode.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                }
            }
        }, 100);
    }
}

// Determinar relação com a pessoa selecionada - versão completa para desktop
function getRelationship(personId, relativeToId) {
    if (personId === relativeToId) return 'Eu';
    
    const relativeTo = selectedPerson.id;
    
    // Pai/Mãe
    const parents = parentsMap[relativeTo];
    if (parents && (parents.father === personId || parents.mother === personId)) {
        return parents.father === personId ? 'Pai' : 'Mãe';
    }
    
    // Filhos
    const children = findChildren(relativeTo);
    if (children.includes(personId)) {
        const person = personsMap[personId];
        return person && person.sexo === 'masculino' ? 'Filho' : 'Filha';
    }
    
    // Cônjuge
    if (areSpouses(personId, relativeTo)) {
        const person = personsMap[personId];
        return person && person.sexo === 'masculino' ? 'Marido' : 'Esposa';
    }
    
    // Avós
    if (parents) {
        // Avô paterno
        if (parents.father) {
            const paternalGrandparents = parentsMap[parents.father];
            if (paternalGrandparents && (paternalGrandparents.father === personId || paternalGrandparents.mother === personId)) {
                return paternalGrandparents.father === personId ? 'Avô P.' : 'Avó P.';
            }
        }
        
        // Avô materno
        if (parents.mother) {
            const maternalGrandparents = parentsMap[parents.mother];
            if (maternalGrandparents && (maternalGrandparents.father === personId || maternalGrandparents.mother === personId)) {
                return maternalGrandparents.father === personId ? 'Avô M.' : 'Avó M.';
            }
        }
    }
    
    return 'Selecionado';
}

// Desenhar conexão entre pais e filhos
function drawConnection(parentPos, childPos, nodeWidth, nodeHeight) {
    const line1 = document.createElement('div');
    line1.className = 'tree-line';
    line1.style.left = `${parentPos.x + nodeWidth/2 - 1}px`;
    line1.style.top = `${parentPos.y + nodeHeight}px`;
    line1.style.width = '2px';
    line1.style.height = '10px';
    treeContainer.appendChild(line1);
    
    const line2 = document.createElement('div');
    line2.className = 'tree-line';
    line2.style.left = `${Math.min(parentPos.x + nodeWidth/2, childPos.x + nodeWidth/2)}px`;
    line2.style.top = `${parentPos.y + nodeHeight + 10}px`;
    line2.style.width = `${Math.abs(childPos.x - parentPos.x)}px`;
    line2.style.height = '2px';
    treeContainer.appendChild(line2);
    
    const line3 = document.createElement('div');
    line3.className = 'tree-line';
    line3.style.left = `${childPos.x + nodeWidth/2 - 1}px`;
    line3.style.top = `${parentPos.y + nodeHeight + 10}px`;
    line3.style.width = '2px';
    line3.style.height = `${childPos.y - (parentPos.y + nodeHeight + 10)}px`;
    treeContainer.appendChild(line3);
}

// Desenhar conexão entre cônjuges
function drawSpouseConnection(pos1, pos2, nodeWidth) {
    const line = document.createElement('div');
    line.className = 'tree-line';
    line.style.left = `${pos1.x + nodeWidth}px`;
    line.style.top = `${pos1.y + 20}px`;
    line.style.width = `${pos2.x - pos1.x - nodeWidth}px`;
    line.style.height = '2px';
    treeContainer.appendChild(line);
}

// Encontrar cônjuges de uma pessoa
function findSpouses(personId) {
    const spouses = [];
    marriages.forEach(marriage => {
        if (marriage.marido === personId && marriage.esposa) {
            spouses.push(marriage.esposa);
        } else if (marriage.esposa === personId && marriage.marido) {
            spouses.push(marriage.marido);
        }
    });
    return spouses;
}

// Verificar se duas pessoas são cônjuges
function areSpouses(personId1, personId2) {
    return marriages.some(marriage => 
        (marriage.marido === personId1 && marriage.esposa === personId2) ||
        (marriage.marido === personId2 && marriage.esposa === personId1)
    );
}

// Encontrar filhos diretos
function findChildren(personId) {
    const children = [];
    
    // Encontrar casamentos desta pessoa
    const personMarriages = marriages.filter(marriage => 
        marriage.marido === personId || marriage.esposa === personId
    );
    
    personMarriages.forEach(marriage => {
        const marriageChildren = childrenMap[marriage.id] || [];
        marriageChildren.forEach(childId => {
            if (!children.includes(childId)) {
                children.push(childId);
            }
        });
    });
    
    return children;
}

// Criar nó da árvore
function createPersonNode(person, x, y, width, height, relationship = '', isDesktop = false, isMobile = false) {
    const node = document.createElement('div');
    node.className = `tree-node ${person.sexo || 'unknown'}`;
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    node.style.width = `${width}px`;
    node.style.height = `${height}px`;
    node.dataset.id = person.id;
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'node-name';
    const fullName = person.nome || 'Nome desconhecido';
    
    const nameMaxLength = isDesktop ? 12 : (isMobile ? 10 : 8);
    if (fullName.length > nameMaxLength) {
        nameDiv.textContent = fullName.substring(0, nameMaxLength) + '...';
    } else {
        nameDiv.textContent = fullName;
    }
    
    nameDiv.style.fontSize = isDesktop ? '0.9rem' : (isMobile ? '0.7rem' : '0.65rem');
    
    const surnameDiv = document.createElement('div');
    surnameDiv.className = 'node-surname';
    const fullSurname = person.sobrenome || '';
    
    const surnameMaxLength = isDesktop ? 14 : (isMobile ? 8 : 10);
    if (fullSurname.length > surnameMaxLength) {
        surnameDiv.textContent = fullSurname.substring(0, surnameMaxLength) + '...';
    } else {
        surnameDiv.textContent = fullSurname;
    }
    
    surnameDiv.style.fontSize = isDesktop ? '0.75rem' : (isMobile ? '0.5rem' : '0.55rem');
    
    // Hide surname on mobile
    if (isMobile) {
        surnameDiv.style.display = 'none';
    }
    
    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'node-details';
    
    const birthYear = extractYear(person.data_nascimento);
    const deathYear = extractYear(person.data_falecimento);
    
    let detailsText = `${birthYear}`;
    if (deathYear && deathYear !== '?') detailsText += `-${deathYear}`;
    
    detailsDiv.textContent = detailsText;
    detailsDiv.style.fontSize = isDesktop ? '0.7rem' : (isMobile ? '0.5rem' : '0.5rem');
    
    const relationshipDiv = document.createElement('div');
    relationshipDiv.className = 'node-relationship';
    relationshipDiv.textContent = relationship;
    relationshipDiv.style.fontSize = isDesktop ? '0.65rem' : (isMobile ? '0.6rem' : '0.55rem');
    
    // Special styling for mobile
    if (isMobile) {
        relationshipDiv.style.fontWeight = 'bold';
        relationshipDiv.style.backgroundColor = 'rgba(52, 152, 219, 0.25)';
        relationshipDiv.style.color = '#2980b9';
        relationshipDiv.style.padding = '2px 4px';
        relationshipDiv.style.borderRadius = '4px';
        relationshipDiv.style.border = '1px solid rgba(52, 152, 219, 0.3)';
        relationshipDiv.style.marginTop = '2px';
    }
    
    node.appendChild(nameDiv);
    node.appendChild(surnameDiv);
    node.appendChild(detailsDiv);
    node.appendChild(relationshipDiv);
    
    node.addEventListener('click', (e) => {
        e.stopPropagation();
        selectPerson(person.id);
    });
    
    return node;
}

// Mostrar detalhes da pessoa
function showPersonDetails(personId) {
    const person = personsMap[personId];
    if (!person || !detailsContent) return;
    
    detailsPanel.classList.add('active');
    detailsContent.innerHTML = '';
    
    // Informações básicas
    addDetailItem('fas fa-user', 'Nome', person.nome || 'Desconhecido');
    addDetailItem('fas fa-tag', 'Sobrenome', person.sobrenome || 'Não registado');
    addDetailItem('fas fa-venus-mars', 'Sexo', person.sexo === 'masculino' ? 'Masculino (♂)' : 
                 person.sexo === 'feminino' ? 'Feminino (♀)' : 'Desconhecido');
    addDetailItem('fas fa-id-card', 'ID', person.id);
    
    // Nascimento
    if (person.data_nascimento) {
        addDetailItem('fas fa-birthday-cake', 'Nascimento', formatDate(person.data_nascimento));
    }
    if (person.lugar_nascimento_nome) {
        addDetailItem('fas fa-map-marker-alt', 'Local Nasc.', person.lugar_nascimento_nome);
    } else if (person.lugar_nascimento) {
        addDetailItem('fas fa-map-marker-alt', 'Local Nasc.', `ID: ${person.lugar_nascimento}`);
    }
    
    // Falecimento
    if (person.data_falecimento) {
        addDetailItem('fas fa-cross', 'Falecimento', formatDate(person.data_falecimento));
    }
    if (person.lugar_falecimento && placesMap[person.lugar_falecimento]) {
        addDetailItem('fas fa-map-marker-alt', 'Local Fal.', placesMap[person.lugar_falecimento].nome);
    }
    
    // Pais
    const parents = parentsMap[personId];
    if (parents) {
        const parentsList = document.createElement('ul');
        parentsList.className = 'relationship-list';
        
        if (parents.father && personsMap[parents.father]) {
            const father = personsMap[parents.father];
            const li = createRelationshipItem(father, 'Pai');
            parentsList.appendChild(li);
        }
        
        if (parents.mother && personsMap[parents.mother]) {
            const mother = personsMap[parents.mother];
            const li = createRelationshipItem(mother, 'Mãe');
            parentsList.appendChild(li);
        }
        
        addDetailItemWithContent('fas fa-users', 'Pais', parentsList);
    }
    
    // Cônjuges
    const spouses = findSpouses(personId);
    if (spouses.length > 0) {
        const spousesList = document.createElement('ul');
        spousesList.className = 'relationship-list';
        
        spouses.forEach(spouseId => {
            const spouse = personsMap[spouseId];
            if (spouse) {
                const relationshipType = spouse.sexo === 'masculino' ? 'Marido' : 'Esposa';
                const li = createRelationshipItem(spouse, relationshipType);
                spousesList.appendChild(li);
            }
        });
        
        addDetailItemWithContent('fas fa-ring', 'Cônjuges', spousesList);
    }
    
    // Filhos
    const children = findChildren(personId);
    if (children.length > 0) {
        const childrenList = document.createElement('ul');
        childrenList.className = 'relationship-list';
        
        children.forEach(childId => {
            const child = personsMap[childId];
            if (child) {
                const relationshipType = child.sexo === 'masculino' ? 'Filho' : 'Filha';
                const li = createRelationshipItem(child, relationshipType);
                childrenList.appendChild(li);
            }
        });
        
        addDetailItemWithContent('fas fa-baby', 'Filhos', childrenList);
    }
    
    // Garantir que o conteúdo seja scrollável
    setTimeout(() => {
        const detailsWrapper = document.querySelector('.details-content-wrapper');
        if (detailsWrapper) {
            detailsWrapper.scrollTop = 0;
        }
    }, 100);
}

// Criar item de relação
function createRelationshipItem(person, relationshipType) {
    const li = document.createElement('li');
    li.className = 'relationship-item';
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'relationship-info';
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'relationship-name';
    nameDiv.textContent = person.nome || 'Desconhecido';
    
    const typeDiv = document.createElement('div');
    typeDiv.className = 'relationship-type';
    typeDiv.textContent = relationshipType;
    
    infoDiv.appendChild(nameDiv);
    infoDiv.appendChild(typeDiv);
    
    const idDiv = document.createElement('div');
    idDiv.className = 'relationship-id';
    idDiv.textContent = person.id;
    
    li.appendChild(infoDiv);
    li.appendChild(idDiv);
    
    li.addEventListener('click', () => selectPerson(person.id));
    
    return li;
}

// Adicionar item de detalhe
function addDetailItem(iconClass, label, value) {
    if (!detailsContent) return;
    
    const item = document.createElement('div');
    item.className = 'detail-item';
    
    const labelDiv = document.createElement('div');
    labelDiv.className = 'detail-label';
    
    const icon = document.createElement('i');
    icon.className = iconClass;
    
    const labelText = document.createElement('span');
    labelText.textContent = label;
    
    labelDiv.appendChild(icon);
    labelDiv.appendChild(labelText);
    
    const valueDiv = document.createElement('div');
    valueDiv.className = 'detail-value';
    valueDiv.textContent = value;
    
    item.appendChild(labelDiv);
    item.appendChild(valueDiv);
    detailsContent.appendChild(item);
}

// Adicionar item de detalhe com conteúdo HTML
function addDetailItemWithContent(iconClass, label, content) {
    if (!detailsContent) return;
    
    const item = document.createElement('div');
    item.className = 'detail-item';
    
    const labelDiv = document.createElement('div');
    labelDiv.className = 'detail-label';
    
    const icon = document.createElement('i');
    icon.className = iconClass;
    
    const labelText = document.createElement('span');
    labelText.textContent = label;
    
    labelDiv.appendChild(icon);
    labelDiv.appendChild(labelText);
    
    const valueDiv = document.createElement('div');
    valueDiv.className = 'detail-value';
    valueDiv.appendChild(content);
    
    item.appendChild(labelDiv);
    item.appendChild(valueDiv);
    detailsContent.appendChild(item);
}

// Formatar data
function formatDate(dateString) {
    if (!dateString) return 'Desconhecida';
    
    try {
        const months = {
            'Jan': 0, 'Fev': 1, 'Mar': 2, 'Abr': 3, 'Mai': 4, 'Jun': 5,
            'Jul': 6, 'Ago': 7, 'Set': 8, 'Out': 9, 'Nov': 10, 'Dez': 11
        };
        
        const parts = dateString.split(' ');
        if (parts.length >= 3) {
            const day = parseInt(parts[0]);
            const month = months[parts[1]];
            const year = parseInt(parts[2]);
            
            if (!isNaN(day) && month !== undefined && !isNaN(year)) {
                return `${day}/${month + 1}/${year}`;
            }
        }
    } catch (e) {}
    
    return dateString;
}

// Mostrar mensagem
function showMessage(message, type) {
    const existing = document.querySelectorAll('.status-message-toast');
    existing.forEach(msg => msg.remove());
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `status-message-toast ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        left: 10px;
        padding: 10px;
        border-radius: 4px;
        color: white;
        font-weight: bold;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        animation: fadeIn 0.3s ease-in;
        font-size: 0.8rem;
        text-align: center;
    `;
    
    if (type === 'success') messageDiv.style.backgroundColor = '#27ae60';
    else if (type === 'error') messageDiv.style.backgroundColor = '#e74c3c';
    else messageDiv.style.backgroundColor = '#3498db';
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => messageDiv.remove(), 3000);
}