// account.js
// Module responsible for loading and displaying information from the
// Account folder of a Discord data export. It exposes two functions:
//  - render(zip, container): asynchronously reads data from the ZIP and
//    populates the given container element with DOM elements.
//  - test(zip): runs simple unit tests on the parsing logic and returns a
//    promise resolving to an array of test result objects.

/* global JSZip */

// Helper to read a text file from the ZIP and parse JSON
async function readJson(zip, path) {
    const file = zip.file(path);
    if (!file) throw new Error(`File not found: ${path}`);
    const text = await file.async('string');
    return JSON.parse(text);
}

// Helper to convert a binary file to a data URI. Accepts images (png/jpeg)
async function fileToDataUri(zip, path) {
    const file = zip.file(path);
    if (!file) return null;
    const data = await file.async('base64');
    // Determine MIME type from extension
    const ext = path.split('.').pop().toLowerCase();
    const mime = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'application/octet-stream';
    return `data:${mime};base64,${data}`;
}

// Parse the user.json file into a simplified object
async function parseUser(zip) {
    const user = await readJson(zip, 'Account/user.json');
    return {
        id: user.id,
        username: user.username,
        discriminator: user.discriminator,
        globalName: user.global_name || null,
        email: user.email,
        verified: user.verified,
        phone: user.phone,
        premiumUntil: user.premium_until,
        flags: user.flags || []
    };
}

// Load the list of applications associated with the account
async function parseApplications(zip) {
    const appsFolder = zip.folder('Account/applications');
    if (!appsFolder) return [];
    const result = [];
    // Each subfolder corresponds to an application ID
    appsFolder.forEach(async (relativePath, file) => {
        // We only care about application.json files
        if (!file.dir && relativePath.endsWith('application.json')) {
            const json = await readJson(zip, `Account/applications/${relativePath}`);
            result.push({
                id: json.id,
                name: json.name,
                description: json.description
            });
        }
    });
    return result;
}

// Load recent avatar thumbnails
async function parseRecentAvatars(zip) {
    const folder = zip.folder('Account/recent_avatars');
    const avatars = [];
    if (!folder) return avatars;
    const files = [];
    folder.forEach((relativePath, file) => {
        if (!file.dir) files.push(relativePath);
    });
    for (const f of files) {
        const uri = await fileToDataUri(zip, `Account/recent_avatars/${f}`);
        avatars.push({ name: f, uri });
    }
    return avatars;
}

// Render the account page
export async function render(zip, container) {
    container.innerHTML = '';
    try {
        const [user, avatarUri, recentAvatars, applications] = await Promise.all([
            parseUser(zip),
            fileToDataUri(zip, 'Account/avatar.png'),
            parseRecentAvatars(zip),
            parseApplications(zip)
        ]);
        // Create elements
        const section = document.createElement('div');
        section.className = 'card';
        const heading = document.createElement('h2');
        heading.textContent = 'Account Information';
        section.appendChild(heading);
        // Avatar
        if (avatarUri) {
            const img = document.createElement('img');
            img.src = avatarUri;
            img.alt = 'Avatar';
            img.style.width = '100px';
            img.style.height = '100px';
            img.style.borderRadius = '50%';
            section.appendChild(img);
        }
        // User details table
        const table = document.createElement('table');
        const tbody = document.createElement('tbody');
        const addRow = (key, value) => {
            const tr = document.createElement('tr');
            const th = document.createElement('th');
            th.textContent = key;
            const td = document.createElement('td');
            td.textContent = value ?? '';
            tr.appendChild(th);
            tr.appendChild(td);
            tbody.appendChild(tr);
        };
        addRow('User ID', user.id);
        addRow('Username', user.username);
        if (user.globalName) addRow('Global Name', user.globalName);
        addRow('Email', user.email);
        addRow('Phone', user.phone || '—');
        addRow('Premium Until', user.premiumUntil || '—');
        addRow('Verified', user.verified ? 'Yes' : 'No');
        addRow('Flags', Array.isArray(user.flags) ? user.flags.join(', ') : '—');
        table.appendChild(tbody);
        section.appendChild(table);
        // Recent avatars
        if (recentAvatars.length) {
            const raHeading = document.createElement('h3');
            raHeading.textContent = 'Recent Avatars';
            section.appendChild(raHeading);
            const raContainer = document.createElement('div');
            raContainer.style.display = 'flex';
            raContainer.style.flexWrap = 'wrap';
            for (const av of recentAvatars) {
                const img = document.createElement('img');
                img.src = av.uri;
                img.alt = av.name;
                img.title = av.name;
                img.style.width = '64px';
                img.style.height = '64px';
                img.style.borderRadius = '4px';
                img.style.margin = '0.25rem';
                raContainer.appendChild(img);
            }
            section.appendChild(raContainer);
        }
        // Applications
        if (applications.length) {
            const appHeading = document.createElement('h3');
            appHeading.textContent = 'Connected Applications';
            section.appendChild(appHeading);
            const list = document.createElement('ul');
            applications.forEach(app => {
                const li = document.createElement('li');
                const strong = document.createElement('strong');
                strong.textContent = app.name;
                li.appendChild(strong);
                if (app.description) {
                    li.appendChild(document.createTextNode(` – ${app.description}`));
                }
                list.appendChild(li);
            });
            section.appendChild(list);
        }
        container.appendChild(section);
    } catch (err) {
        console.error('Account rendering error', err);
        const errorP = document.createElement('p');
        errorP.textContent = 'Error loading account data: ' + err.message;
        container.appendChild(errorP);
    }
}

// Simple tests for the account module
export async function test(zip) {
    const results = [];
    // Test parseUser returns required fields
    try {
        const user = await parseUser(zip);
        const condition = !!user.id && !!user.username;
        results.push({ name: 'parseUser: ID and username present', passed: condition });
    } catch (err) {
        results.push({ name: 'parseUser throws exception', passed: false });
    }
    // Test avatar file exists
    const hasAvatar = !!zip.file('Account/avatar.png');
    results.push({ name: 'avatar.png exists', passed: hasAvatar });
    return results;
}
