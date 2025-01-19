// Supabase configuratie
const SUPABASE_URL = 'https://lmfvilfnwsylaxgdnolc.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtZnZpbGZud3N5bGF4Z2Rub2xjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1Mzc2OTMsImV4cCI6MjA1MjExMzY5M30.7to9Db88XzGtJLvjL07Th5ssCqL2e88niyISIBDB9qI'

// Initialiseer Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Maak globaal beschikbaar
window.supabaseClient = supabase;

// Cloudinary configuratie
const cloudinaryConfig = {
    cloudName: 'qcrulxlgz',
    uploadPreset: 'website_builder'
};

// Maak Cloudinary config globaal beschikbaar
window.cloudinaryConfig = cloudinaryConfig;

// Helper functie voor Cloudinary uploads
async function uploadToCloudinary(file, folder = 'websites') {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', cloudinaryConfig.uploadPreset)
    formData.append('folder', folder)

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/auto/upload`,
        {
            method: 'POST',
            body: formData
        }
    )

    if (!response.ok) {
        throw new Error('Upload failed')
    }

    return await response.json()
}

// Maak upload functie globaal beschikbaar
window.uploadToCloudinary = uploadToCloudinary;