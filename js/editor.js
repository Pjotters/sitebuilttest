import { supabase, cloudinary, uploadToCloudinary } from './config.js';
import { signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { collection, doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import JSZip from 'jszip';
import templates from './templates.js';

// Auth functies
async function login() {
    try {
        const { user, error } = await supabase.auth.signInWithOAuth({
            provider: 'github'
        });
        if (error) throw error;
        showEditor();
    } catch (error) {
        console.error('Login error:', error);
    }
}

async function logout() {
    try {
        await supabase.auth.signOut();
        hideEditor();
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Media upload met Cloudinary
async function uploadImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', cloudinary.uploadPreset);

        try {
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/image/upload`,
                {
                    method: 'POST',
                    body: formData
                }
            );
            const data = await response.json();
            
            const img = document.createElement('img');
            img.src = data.secure_url;
            img.style.maxWidth = '100%';
            document.getElementById('content').appendChild(img);
        } catch (error) {
            console.error('Upload error:', error);
        }
    };

    input.click();
}

// Editor functies
function addHeading() {
    const heading = document.createElement('h2');
    heading.textContent = 'Nieuwe Kop';
    document.getElementById('content').appendChild(heading);
}

function addParagraph() {
    const para = document.createElement('p');
    para.textContent = 'Nieuwe paragraaf';
    document.getElementById('content').appendChild(para);
}

function addImage() {
    const url = prompt('Voer de URL van de afbeelding in:');
    if (url) {
        const img = document.createElement('img');
        img.src = url;
        img.style.maxWidth = '100%';
        document.getElementById('content').appendChild(img);
    }
}

// Website opslaan
async function saveWebsite() {
    const { user } = await supabase.auth.getUser();
    if (!user) return;

    const content = document.getElementById('content').innerHTML;
    const styles = document.getElementById('customStyles')?.innerHTML || '';

    try {
        const { error } = await supabase
            .from('websites')
            .upsert({
                user_id: user.id,
                content: content,
                styles: styles,
                updated_at: new Date()
            });
        
        if (error) throw error;
        alert('Website opgeslagen!');
    } catch (error) {
        console.error('Opslaan mislukt:', error);
    }
}

// Website laden
function loadWebsites() {
    const user = auth.currentUser;
    if (!user) return;

    db.collection('websites').doc(user.uid).get()
        .then((doc) => {
            if (doc.exists) {
                document.getElementById('content').innerHTML = doc.data().content;
            }
        })
        .catch((error) => console.error('Laden mislukt:', error));
}

// Auth state observer
auth.onAuthStateChanged((user) => {
    if (user) {
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'block';
        document.getElementById('editor').style.display = 'block';
        loadWebsites();
    } else {
        document.getElementById('loginBtn').style.display = 'block';
        document.getElementById('logoutBtn').style.display = 'none';
        document.getElementById('editor').style.display = 'none';
    }
});

// Nieuwe website maken
async function createNewWebsite() {
    const user = auth.currentUser;
    if (!user) return;

    const websiteData = {
        name: 'Nieuwe Website',
        template: 'basic-template',
        content: {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    try {
        const websiteRef = doc(collection(db, 'users', user.uid, 'websites'));
        await setDoc(websiteRef, websiteData);
        loadWebsiteEditor(websiteRef.id);
    } catch (error) {
        console.error('Fout bij maken nieuwe website:', error);
    }
}

// Website editor laden
async function loadWebsiteEditor(websiteId) {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const websiteRef = doc(db, 'users', user.uid, 'websites', websiteId);
        const websiteDoc = await getDoc(websiteRef);
        
        if (websiteDoc.exists()) {
            const websiteData = websiteDoc.data();
            document.getElementById('editor').innerHTML = `
                <div class="website-builder">
                    <div class="toolbar">
                        <button onclick="addSection()">Sectie Toevoegen</button>
                        <button onclick="saveChanges('${websiteId}')">Opslaan</button>
                        <button onclick="previewWebsite('${websiteId}')">Voorvertoning</button>
                    </div>
                    <div id="website-content" class="editor-content">
                        ${await loadTemplate(websiteData.template)}
                    </div>
                </div>
            `;
            makeElementsEditable();
        }
    } catch (error) {
        console.error('Fout bij laden editor:', error);
    }
}

// Template laden
async function loadTemplate(templateName) {
    try {
        const response = await fetch(`/templates/${templateName}.html`);
        return await response.text();
    } catch (error) {
        console.error('Fout bij laden template:', error);
        return '<div>Error loading template</div>';
    }
}

// Elementen bewerkbaar maken
function makeElementsEditable() {
    const editables = document.querySelectorAll('.editable');
    editables.forEach(element => {
        element.addEventListener('click', function() {
            const type = this.dataset.type;
            switch(type) {
                case 'text':
                    editText(this);
                    break;
                case 'menu':
                    editMenu(this);
                    break;
                // Voeg meer types toe indien nodig
            }
        });
    });
}

// Tekst bewerken
function editText(element) {
    const currentText = element.innerHTML;
    element.innerHTML = `
        <textarea style="width: 100%; min-height: 100px;">${currentText}</textarea>
        <button onclick="saveText(this.parentElement)">Opslaan</button>
    `;
}

// Tekst opslaan
function saveText(element) {
    const newText = element.querySelector('textarea').value;
    element.innerHTML = newText;
}

// Menu bewerken
function editMenu(element) {
    const currentMenu = element.innerHTML;
    element.innerHTML = `
        <div class="menu-editor">
            <button onclick="addMenuItem(this.parentElement)">+ Menu Item</button>
            <ul class="menu-items">
                ${currentMenu}
            </ul>
        </div>
    `;
}

// Website exporteren
async function exportWebsite() {
    const websiteContent = document.getElementById('website-content');
    const styles = document.getElementById('customStyles')?.innerHTML || '';
    
    // HTML template maken
    const htmlTemplate = `
<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${document.title}</title>
    <style>
        ${styles}
    </style>
</head>
<body>
    ${websiteContent.innerHTML}
</body>
</html>`;

    // CSS bestand maken
    const cssContent = `
/* Custom styles */
${styles}
    `;

    // Maak een ZIP bestand
    const zip = new JSZip();
    zip.file('index.html', htmlTemplate);
    zip.file('styles.css', cssContent);
    
    // Assets toevoegen (afbeeldingen etc.)
    const images = websiteContent.getElementsByTagName('img');
    for (let img of images) {
        try {
            const response = await fetch(img.src);
            const blob = await response.blob();
            const fileName = img.src.split('/').pop();
            zip.file(`images/${fileName}`, blob);
        } catch (error) {
            console.error('Fout bij downloaden afbeelding:', error);
        }
    }

    // Download ZIP bestand
    zip.generateAsync({type: 'blob'})
        .then(function(content) {
            const url = window.URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'mijn-website.zip';
            link.click();
        });
}

// Code viewer
function viewCode() {
    const websiteContent = document.getElementById('website-content');
    const styles = document.getElementById('customStyles')?.innerHTML || '';
    
    const codeViewer = document.createElement('div');
    codeViewer.className = 'code-viewer';
    codeViewer.innerHTML = `
        <div class="code-tabs">
            <button onclick="showTab('html')">HTML</button>
            <button onclick="showTab('css')">CSS</button>
        </div>
        <div class="code-content">
            <pre id="htmlCode">${escapeHtml(websiteContent.innerHTML)}</pre>
            <pre id="cssCode" style="display:none">${escapeHtml(styles)}</pre>
        </div>
        <button onclick="this.parentElement.remove()">Sluiten</button>
    `;
    
    document.body.appendChild(codeViewer);
}

// Style editor
function openStyleEditor() {
    const styleEditor = document.createElement('div');
    styleEditor.className = 'style-editor';
    styleEditor.innerHTML = `
        <h3>CSS Editor</h3>
        <textarea id="cssEditor">${document.getElementById('customStyles')?.innerHTML || ''}</textarea>
        <button onclick="saveStyles()">Opslaan</button>
        <button onclick="this.parentElement.remove()">Sluiten</button>
    `;
    
    document.body.appendChild(styleEditor);
}

function saveStyles() {
    const css = document.getElementById('cssEditor').value;
    let styleTag = document.getElementById('customStyles');
    
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'customStyles';
        document.head.appendChild(styleTag);
    }
    
    styleTag.innerHTML = css;
}

// Helper functies
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Template systeem
function showTemplateCategory(category) {
    const templateContent = document.getElementById('templateContent');
    templateContent.innerHTML = '';
    
    Object.entries(templates[category]).forEach(([name, template]) => {
        const templateItem = document.createElement('div');
        templateItem.className = 'template-item';
        templateItem.innerHTML = `
            <div class="template-preview">${template}</div>
            <button onclick="insertTemplate('${category}', '${name}')">Toevoegen</button>
        `;
        templateContent.appendChild(templateItem);
    });
}

function insertTemplate(category, name) {
    const template = templates[category][name];
    const content = document.getElementById('content');
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = template;
    content.appendChild(tempDiv.firstChild);
}

// Lokaal opslaan
function saveLocal() {
    const websiteData = {
        content: document.getElementById('content').innerHTML,
        styles: document.getElementById('customStyles')?.innerHTML || '',
        lastSaved: new Date().toISOString()
    };
    localStorage.setItem('websiteData', JSON.stringify(websiteData));
    alert('Website lokaal opgeslagen!');
}

// Lokaal laden
function loadLocal() {
    const savedData = localStorage.getItem('websiteData');
    if (savedData) {
        const data = JSON.parse(savedData);
        document.getElementById('content').innerHTML = data.content;
        
        let styleTag = document.getElementById('customStyles');
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = 'customStyles';
            document.head.appendChild(styleTag);
        }
        styleTag.innerHTML = data.styles;
    }
}

async function loadPage(id) {
    const { data: page, error } = await supabase
        .from('websites')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error loading page:', error);
        return;
    }

    document.getElementById('content').innerHTML = page.content || '';
    if (page.styles) {
        let styleTag = document.getElementById('customStyles');
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = 'customStyles';
            document.head.appendChild(styleTag);
        }
        styleTag.innerHTML = page.styles;
    }
}

async function savePage() {
    try {
        const saveButton = document.querySelector('button[onclick="savePage()"]')
        saveButton.disabled = true
        saveButton.innerHTML = 'Opslaan...'

        const urlParams = new URLSearchParams(window.location.search)
        const pageId = urlParams.get('page')
        
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const content = document.getElementById('content').innerHTML
        const styles = document.getElementById('customStyles')?.innerHTML || ''

        // Genereer HTML bestand
        const htmlContent = `
<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mijn Website</title>
    <style>${styles}</style>
</head>
<body>
    ${content}
</body>
</html>`

        // Upload naar Cloudinary
        const blob = new Blob([htmlContent], { type: 'text/html' })
        const file = new File([blob], `website-${pageId}.html`, { type: 'text/html' })
        const cloudinaryResponse = await uploadToCloudinary(file, 'websites')

        // Update Supabase
        const { error } = await supabase
            .from('websites')
            .update({
                content: content,
                styles: styles,
                published_url: cloudinaryResponse.secure_url,
                cloudinary_id: cloudinaryResponse.public_id,
                updated_at: new Date()
            })
            .eq('id', pageId)

        if (error) throw error

        saveButton.innerHTML = 'Opgeslagen!'
        setTimeout(() => {
            saveButton.disabled = false
            saveButton.innerHTML = 'Pagina Opslaan'
        }, 2000)
    } catch (error) {
        showError('Er ging iets mis bij het opslaan')
        console.error('Save error:', error)
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = '/login.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const pageId = urlParams.get('page');
    if (pageId) {
        await loadPage(pageId);
    }
});

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
}

async function testCloudinaryUpload() {
    const testContent = `
        <html>
            <body>
                <h1>Test Upload</h1>
            </body>
        </html>
    `;
    
    const blob = new Blob([testContent], { type: 'text/html' });
    const file = new File([blob], 'test.html', { type: 'text/html' });
    
    try {
        const result = await uploadToCloudinary(file, 'test');
        console.log('Upload succesvol:', result);
        alert('Test upload succesvol! URL: ' + result.secure_url);
    } catch (error) {
        console.error('Upload mislukt:', error);
        alert('Upload mislukt: ' + error.message);
    }
}

// Initialiseer drag & drop functionaliteit
document.addEventListener('DOMContentLoaded', () => {
    initializeDragAndDrop();
    initializeComponentsList();
});

function initializeComponentsList() {
    const components = document.querySelectorAll('.component-item');
    
    components.forEach(component => {
        component.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', component.dataset.type);
            component.classList.add('dragging');
        });

        component.addEventListener('dragend', (e) => {
            component.classList.remove('dragging');
        });
    });
}

function initializeDragAndDrop() {
    const websiteContent = document.getElementById('websiteContent');
    
    // Maak alle componenten sorteerbaar
    new Sortable(websiteContent, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        handle: '.component-handle',
        onStart: function(evt) {
            evt.item.classList.add('dragging');
        },
        onEnd: function(evt) {
            evt.item.classList.remove('dragging');
        }
    });

    // Grid toggle functie
    const gridToggle = document.createElement('button');
    gridToggle.className = 'grid-toggle';
    gridToggle.innerHTML = 'Grid Weergeven';
    gridToggle.onclick = function() {
        websiteContent.classList.toggle('show-grid');
        this.innerHTML = websiteContent.classList.contains('show-grid') ? 
            'Grid Verbergen' : 'Grid Weergeven';
    };
    document.querySelector('.editor-toolbar').appendChild(gridToggle);

    // Component creation
    function createComponent(type) {
        const component = document.createElement('div');
        component.className = 'component';
        component.dataset.type = type;

        const handle = document.createElement('div');
        handle.className = 'component-handle';
        
        const controls = createComponentControls();
        
        let content;
        switch(type) {
            case 'grid-2':
                content = `<div class="grid-2-cols">${'<div class="grid-col"></div>'.repeat(2)}</div>`;
                break;
            case 'grid-3':
                content = `<div class="grid-3-cols">${'<div class="grid-col"></div>'.repeat(3)}</div>`;
                break;
            // Voeg hier meer componenten toe
        }

        component.innerHTML = content;
        component.prepend(handle);
        component.appendChild(controls);
        return component;
    }
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.component:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

async function downloadWebsite() {
    const websiteContent = document.getElementById('websiteContent');
    
    // Genereer HTML
    const html = generateHTML(websiteContent);
    const css = generateCSS();
    
    // Maak ZIP bestand
    const zip = new JSZip();
    zip.file('index.html', html);
    zip.file('styles.css', css);
    
    // Download ZIP
    const content = await zip.generateAsync({type: 'blob'});
    const url = window.URL.createObjectURL(content);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mijn-website.zip';
    a.click();
}

// Modal functionaliteit
function initializeBlockSystem() {
    const addBlockBtn = document.querySelector('.add-block-btn');
    const blockModal = document.getElementById('blockModal');
    const blockOptions = document.querySelectorAll('.block-option');
    const blocksList = document.getElementById('blocksList');

    // Open modal wanneer op 'Voeg blok toe' wordt geklikt
    addBlockBtn.addEventListener('click', () => {
        blockModal.style.display = 'block';
    });

    // Sluit modal wanneer buiten de content wordt geklikt
    blockModal.addEventListener('click', (e) => {
        if (e.target === blockModal) {
            blockModal.style.display = 'none';
        }
    });

    // Voeg blok toe wanneer op een optie wordt geklikt
    blockOptions.forEach(option => {
        option.addEventListener('click', () => {
            const blockType = option.dataset.type;
            addBlock(blockType);
            blockModal.style.display = 'none';
        });
    });

    // Maak blokken sorteerbaar
    new Sortable(blocksList, {
        animation: 150,
        handle: '.block-handle',
        ghostClass: 'block-ghost'
    });
}

// Functie om een nieuw blok toe te voegen
function addBlock(type) {
    const block = document.createElement('div');
    block.className = 'block';
    block.dataset.type = type;

    // Voeg handle toe voor drag & drop
    const handle = document.createElement('div');
    handle.className = 'block-handle';
    handle.innerHTML = '⋮';

    // Voeg controls toe
    const controls = document.createElement('div');
    controls.className = 'block-controls';
    controls.innerHTML = `
        <button onclick="moveBlock(this, 'up')">↑</button>
        <button onclick="moveBlock(this, 'down')">↓</button>
        <button onclick="removeBlock(this)">×</button>
    `;

    // Voeg content toe op basis van type
    let content;
    switch(type) {
        case 'heading':
            content = `<h2 contenteditable="true">Nieuwe Kop</h2>`;
            break;
        case 'paragraph':
            content = `<p contenteditable="true">Nieuwe paragraaf tekst...</p>`;
            break;
        case 'list':
            content = `
                <ul contenteditable="true">
                    <li>Lijst item 1</li>
                    <li>Lijst item 2</li>
                </ul>
            `;
            break;
        case 'image':
            content = `
                <div class="image-block">
                    <img src="placeholder.jpg" alt="Afbeelding">
                    <button onclick="changeImage(this)">Afbeelding wijzigen</button>
                </div>
            `;
            break;
    }

    block.innerHTML = content;
    block.prepend(handle);
    block.appendChild(controls);
    document.getElementById('blocksList').appendChild(block);
}

// Hulpfuncties voor blok manipulatie
function moveBlock(button, direction) {
    const block = button.closest('.block');
    const sibling = direction === 'up' ? 
        block.previousElementSibling : 
        block.nextElementSibling;

    if (sibling) {
        block.parentNode.insertBefore(
            direction === 'up' ? block : sibling,
            direction === 'up' ? sibling : block
        );
    }
}

function removeBlock(button) {
    if (confirm('Weet je zeker dat je dit blok wilt verwijderen?')) {
        button.closest('.block').remove();
    }
}

function changeImage(button) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = button.previousElementSibling;
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    };

    input.click();
}

// Initialiseer het systeem wanneer de pagina laadt
document.addEventListener('DOMContentLoaded', initializeBlockSystem); 