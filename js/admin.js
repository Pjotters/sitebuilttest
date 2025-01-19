const cloudinaryConfig = {
    cloudName: 'qcrulxlgz',
    uploadPreset: 'website_builder'
};

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    'https://lmfvilfnwsylaxgdnolc.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtZnZpbGZud3N5bGF4Z2Rub2xjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1Mzc2OTMsImV4cCI6MjA1MjExMzY5M30.7to9Db88XzGtJLvjL07Th5ssCqL2e88niyISIBDB9qI'
);

// Voeg toe aan het begin van admin.js
function showLoading(element) {
    element.innerHTML = '<div class="loading">Laden...</div>';
}

// Panel management
function showPanel(panelName) {
    // Verberg alle panels
    document.querySelectorAll('.panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    // Verwijder active class van alle menu items
    document.querySelectorAll('.admin-menu a').forEach(item => {
        item.classList.remove('active');
    });
    
    // Activeer het juiste panel
    document.getElementById(`${panelName}-panel`).classList.add('active');
    document.querySelector(`[onclick="showPanel('${panelName}')"]`).classList.add('active');
    
    // Laad de juiste content
    switch(panelName) {
        case 'websites':
            loadWebsites();
            break;
        case 'templates':
            loadTemplates();
            break;
        case 'profile':
            loadProfile();
            break;
    }
}

// Recent pages laden
async function loadRecentPages() {
    const recentList = document.getElementById('recentPagesList');
    showLoading(recentList);
    
    const { data: pages, error } = await supabase
        .from('websites')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(5);

    if (error) {
        recentList.innerHTML = '<div class="error">Er ging iets mis bij het laden</div>';
        console.error('Error loading recent pages:', error);
        return;
    }

    recentList.innerHTML = pages.map(page => `
        <div class="page-item">
            <h3>${page.title || 'Untitled'}</h3>
            <p>Laatst bewerkt: ${new Date(page.updated_at).toLocaleString()}</p>
            <div class="page-actions">
                <button class="edit" onclick="editPage('${page.id}')">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                    Bewerken
                </button>
                <button class="delete" onclick="deletePage('${page.id}')">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                    Verwijderen
                </button>
            </div>
        </div>
    `).join('');
}

// Nieuwe pagina maken
async function createNewPage() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert('Je moet ingelogd zijn om een pagina te maken');
            return;
        }

        const { data, error } = await supabase
            .from('websites')
            .insert([
                {
                    user_id: user.id,
                    title: 'Nieuwe Pagina',
                    content: '',
                    created_at: new Date(),
                    updated_at: new Date()
                }
            ])
            .select();

        if (error) throw error;

        window.location.href = `/editor.html?page=${data[0].id}`;
    } catch (error) {
        console.error('Error:', error);
        alert('Er ging iets mis bij het maken van een nieuwe pagina');
    }
}

// Media library
async function openMediaLibrary() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    
    input.onchange = async (e) => {
        const files = Array.from(e.target.files);
        for (const file of files) {
            await uploadMedia(file);
        }
    };

    input.click();
}

async function uploadMedia(file) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
        // Upload naar Cloudinary
        const cloudinaryResponse = await uploadToCloudinary(file, 'media')

        // Sla referentie op in Supabase
        const { error } = await supabase
            .from('media')
            .insert([
                {
                    user_id: user.id,
                    url: cloudinaryResponse.secure_url,
                    cloudinary_id: cloudinaryResponse.public_id,
                    type: file.type,
                    filename: file.name
                }
            ])

        if (error) throw error

        return cloudinaryResponse.secure_url
    } catch (error) {
        console.error('Upload error:', error)
        showError('Upload mislukt')
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = '/login.html';
        return;
    }

    await loadRecentPages();
}); 

async function deletePage(id) {
    if (!confirm('Weet je zeker dat je deze pagina wilt verwijderen?')) return;
    
    const { error } = await supabase
        .from('websites')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting page:', error);
        return;
    }

    await loadRecentPages();
} 

function editPage(id) {
    window.location.href = `/editor.html?page=${id}`;
} 

async function testCloudinaryUpload() {
    try {
        const testContent = 'Test content';
        const blob = new Blob([testContent], { type: 'text/plain' });
        const file = new File([blob], 'test.txt', { type: 'text/plain' });
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'website_builder');
        
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/qcrulxlgz/auto/upload`,
            {
                method: 'POST',
                body: formData
            }
        );

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message);
        }
        
        console.log('Upload succesvol:', data);
        alert('Test upload succesvol! URL: ' + data.secure_url);
    } catch (error) {
        console.error('Upload mislukt:', error);
        alert('Upload mislukt: ' + error.message);
    }
} 

async function loadDashboardStats() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
        // Laad statistieken
        const { data: pages } = await supabase
            .from('websites')
            .select('*')
            .eq('user_id', user.id);

        const { data: media } = await supabase
            .from('media')
            .select('*')
            .eq('user_id', user.id);

        // Update UI
        document.getElementById('totalPages').textContent = pages?.length || 0;
        document.getElementById('totalMedia').textContent = media?.length || 0;
        document.getElementById('lastUpdate').textContent = 
            pages?.[0]?.updated_at ? new Date(pages[0].updated_at).toLocaleDateString() : '-';
    } catch (error) {
        console.error('Error loading stats:', error);
    }
} 

async function openTemplates() {
    const templatesPanel = document.getElementById('templates-panel');
    showPanel('templates');
    showLoading(templatesPanel);

    try {
        const { data: templates, error } = await supabase
            .from('templates')
            .select('*')
            .order('name');

        if (error) throw error;

        templatesPanel.innerHTML = `
            <h1>Templates</h1>
            <div class="templates-grid">
                ${templates.map(template => `
                    <div class="template-card">
                        <img src="${template.preview_url}" alt="${template.name}">
                        <div class="template-info">
                            <h3>${template.name}</h3>
                            <p>${template.description}</p>
                            <button onclick="useTemplate('${template.id}')" class="primary-button">
                                Gebruik Template
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading templates:', error);
        templatesPanel.innerHTML = '<div class="error">Er ging iets mis bij het laden van templates</div>';
    }
}

async function useTemplate(templateId) {
    try {
        const { data: template, error: templateError } = await supabase
            .from('templates')
            .select('*')
            .eq('id', templateId)
            .single();

        if (templateError) throw templateError;

        const { data, error } = await supabase
            .from('websites')
            .insert([{
                user_id: (await supabase.auth.getUser()).data.user.id,
                title: 'Nieuwe Pagina',
                content: template.content,
                template_id: templateId,
                created_at: new Date(),
                updated_at: new Date()
            }])
            .select();

        if (error) throw error;

        window.location.href = `/editor.html?page=${data[0].id}`;
    } catch (error) {
        console.error('Error using template:', error);
        alert('Er ging iets mis bij het gebruiken van de template');
    }
} 

async function loadMediaLibrary() {
    const mediaList = document.getElementById('mediaList');
    showLoading(mediaList);

    try {
        const { data: media, error } = await supabase
            .from('media')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        mediaList.innerHTML = `
            <div class="media-header">
                <h1>Media Bibliotheek</h1>
                <button onclick="openMediaLibrary()" class="primary-button">
                    Upload Media
                </button>
            </div>
            <div class="media-grid">
                ${media.map(item => `
                    <div class="media-item" data-id="${item.id}">
                        <div class="media-preview">
                            ${item.type.startsWith('image/') 
                                ? `<img src="${item.url}" alt="${item.filename}">`
                                : `<div class="file-icon">${item.type}</div>`
                            }
                        </div>
                        <div class="media-info">
                            <p>${item.filename}</p>
                            <div class="media-actions">
                                <button onclick="copyMediaUrl('${item.url}')" class="icon-button">
                                    <svg><!-- Copy icon --></svg>
                                </button>
                                <button onclick="deleteMedia('${item.id}')" class="icon-button delete">
                                    <svg><!-- Delete icon --></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading media:', error);
        mediaList.innerHTML = '<div class="error">Er ging iets mis bij het laden van media</div>';
    }
}

function copyMediaUrl(url) {
    navigator.clipboard.writeText(url);
    showNotification('URL gekopieerd naar klembord');
}

async function deleteMedia(id) {
    if (!confirm('Weet je zeker dat je dit media item wilt verwijderen?')) return;

    try {
        const { error } = await supabase
            .from('media')
            .delete()
            .eq('id', id);

        if (error) throw error;

        await loadMediaLibrary();
        showNotification('Media item verwijderd');
    } catch (error) {
        console.error('Error deleting media:', error);
        showError('Verwijderen mislukt');
    }
} 

window.addEventListener('load', async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        
        // Update UI met gebruikersgegevens
        document.getElementById('userName').textContent = user.email.split('@')[0];
        document.getElementById('userEmail').textContent = user.email;
        
        // Laad dashboard statistieken
        loadDashboardStats();
    } catch (error) {
        console.error('Error:', error);
        window.location.href = 'login.html';
    }
}); 

async function loadAnalytics() {
    const timeRange = document.getElementById('timeRange').value;
    // Implementeer analytics data ophalen
    // Voor nu gebruiken we dummy data
    const analyticsData = {
        visitors: 1234,
        pageViews: 5678,
        avgTime: '2:45'
    };

    document.getElementById('visitorCount').textContent = analyticsData.visitors;
    document.getElementById('pageViews').textContent = analyticsData.pageViews;
    document.getElementById('avgTime').textContent = analyticsData.avgTime;
}

async function runHealthCheck() {
    const healthCheckBtn = document.querySelector('.health-check button');
    healthCheckBtn.disabled = true;
    healthCheckBtn.innerHTML = 'Bezig met controleren...';

    try {
        // Implementeer health check logica
        // Voor nu simuleren we een check
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const results = [
            { name: 'SSL Certificaat', status: 'good', message: 'Geldig' },
            { name: 'Laadtijd', status: 'warning', message: '2.3s' },
            { name: 'Mobile Friendly', status: 'good', message: 'Ja' }
        ];

        const resultsHTML = results.map(result => `
            <div class="health-item">
                <span>${result.name}</span>
                <div class="health-status">
                    <span class="status-indicator status-${result.status}"></span>
                    ${result.message}
                </div>
            </div>
        `).join('');

        document.getElementById('healthCheckResults').innerHTML = resultsHTML;
    } catch (error) {
        console.error('Health check failed:', error);
    } finally {
        healthCheckBtn.disabled = false;
        healthCheckBtn.innerHTML = 'Check Uitvoeren';
    }
}

// Event listeners
document.getElementById('timeRange')?.addEventListener('change', loadAnalytics); 

async function createBackup() {
    const backupBtn = document.querySelector('.backup button');
    backupBtn.disabled = true;
    backupBtn.innerHTML = 'Backup maken...';

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Simuleer backup proces
        await new Promise(resolve => setTimeout(resolve, 2000));

        const { data: websites } = await supabase
            .from('websites')
            .select('*')
            .eq('user_id', user.id);

        const backup = {
            timestamp: new Date().toISOString(),
            websites: websites
        };

        // Sla backup op in Supabase storage
        const { error } = await supabase
            .storage
            .from('backups')
            .upload(`${user.id}/${backup.timestamp}.json`, JSON.stringify(backup));

        if (error) throw error;

        loadBackups();
        alert('Backup succesvol gemaakt!');
    } catch (error) {
        console.error('Backup error:', error);
        alert('Er ging iets mis bij het maken van de backup');
    } finally {
        backupBtn.disabled = false;
        backupBtn.innerHTML = 'Backup Maken';
    }
}

async function updateDomain() {
    const domain = document.getElementById('customDomain').value;
    if (!domain) {
        alert('Vul een domeinnaam in');
        return;
    }

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Implementeer domein koppeling logica
        await new Promise(resolve => setTimeout(resolve, 1000));
        alert(`Domein ${domain} wordt gekoppeld. Dit kan tot 24 uur duren.`);
    } catch (error) {
        console.error('Domain update error:', error);
        alert('Er ging iets mis bij het koppelen van het domein');
    }
} 

async function loadWebsites() {
    const websitesPanel = document.getElementById('websites-panel');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    try {
        const { data: websites, error } = await supabase
            .from('websites')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });

        if (error) throw error;

        const websitesHTML = websites.map(website => `
            <div class="website-card">
                <h3>${website.title || 'Naamloze Website'}</h3>
                <p>Laatst bewerkt: ${new Date(website.updated_at).toLocaleDateString()}</p>
                <div class="website-actions">
                    <button onclick="editPage('${website.id}')" class="primary-btn">Bewerken</button>
                    <button onclick="deletePage('${website.id}')" class="secondary-btn">Verwijderen</button>
                </div>
            </div>
        `).join('');

        websitesPanel.querySelector('.panel-content').innerHTML = websitesHTML;
    } catch (error) {
        console.error('Error loading websites:', error);
    }
}

async function loadTemplates() {
    const templatesPanel = document.getElementById('templates-panel');
    const templates = [
        { id: 'business', name: 'Business Website', description: 'Perfect voor bedrijven' },
        { id: 'portfolio', name: 'Portfolio', description: 'Showcase je werk' },
        { id: 'blog', name: 'Blog', description: 'Start je eigen blog' }
    ];

    const templatesHTML = templates.map(template => `
        <div class="template-card" onclick="useTemplate('${template.id}')">
            <img src="images/templates/${template.id}.jpg" alt="${template.name}">
            <div class="template-info">
                <h3>${template.name}</h3>
                <p>${template.description}</p>
            </div>
        </div>
    `).join('');

    templatesPanel.querySelector('.panel-content').innerHTML = templatesHTML;
}

async function loadProfile() {
    const profilePanel = document.getElementById('profile-panel');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    profilePanel.querySelector('.panel-content').innerHTML = `
        <div class="profile-form">
            <div class="form-group">
                <label>Naam</label>
                <input type="text" id="profileName" value="${user.user_metadata?.name || ''}">
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" value="${user.email}" disabled>
            </div>
            <button onclick="updateProfile()" class="primary-btn">Profiel Opslaan</button>
        </div>
    `;
} 

// Voeg deze event listener toe om de stats te laden bij het opstarten
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardStats();
}); 