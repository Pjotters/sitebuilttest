// Wacht tot alles geladen is
window.addEventListener('load', async () => {
    try {
        const { data: { user } } = await window.supabase.auth.getUser();
        if (!user && window.location.pathname !== '/testfase2/' && window.location.pathname !== '/testfase2/index.html') {
            window.location.href = 'login.html';
            return;
        }
    } catch (error) {
        console.error('Auth check error:', error);
    }
});

async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const { data, error } = await window.supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;
        window.location.href = 'dashboard.html';
    } catch (error) {
        console.error('Login error:', error);
        alert('Login mislukt: ' + error.message);
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
        alert('Wachtwoorden komen niet overeen');
        return;
    }

    try {
        const { data, error } = await window.supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${window.location.origin}/testfase2/dashboard.html`
            }
        });

        if (error) throw error;
        alert('Registratie succesvol! Check je email voor de bevestigingslink.');
        showTab('login');
    } catch (error) {
        console.error('Registration error:', error);
        alert('Registratie mislukt: ' + (error.message || 'Onbekende fout'));
    }
}

function showTab(tabName) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabs = document.querySelectorAll('.tab');

    if (tabName === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        tabs[0].classList.add('active');
        tabs[1].classList.remove('active');
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        tabs[0].classList.remove('active');
        tabs[1].classList.add('active');
    }
} 