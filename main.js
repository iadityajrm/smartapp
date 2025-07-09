const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');

let mainWindow;
let appWindow;

// ✅ Allow mic, speech, and media input in Electron Chromium
app.commandLine.appendSwitch('enable-speech-dispatcher');
app.commandLine.appendSwitch('enable-media-stream');
app.commandLine.appendSwitch('use-fake-ui-for-media-stream'); // auto-grant mic permissions (helpful on RPi)

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        kiosk: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false, // allow local file access
            allowRunningInsecureContent: true, // useful if loading local assets
            autoplayPolicy: 'no-user-gesture-required', // ✅ enable autoplay for TTS
            sandbox: false
        },
    });

    mainWindow.loadFile(path.join(__dirname, 'public', 'index.html'));

    // LAUNCH APP
    ipcMain.on('launch-app', (event, url) => {
        if (appWindow && !appWindow.isDestroyed()) {
            appWindow.close();
        }

        appWindow = new BrowserWindow({
            fullscreen: true,
            alwaysOnTop: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        // Spoof Smart TV user-agent
        appWindow.webContents.setUserAgent(
            "Mozilla/5.0 (SMART-TV; Linux; Tizen 2.4.0) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/1.1 TV Safari/538.1"
        );

        appWindow.loadURL(url);

        // Inject CSS + focus + simulate input
        appWindow.webContents.on('did-finish-load', () => {
            appWindow.webContents.insertCSS('body, * { cursor: none !important; }');
            appWindow.webContents.focus();
            appWindow.webContents.sendInputEvent({
                type: 'keyDown',
                keyCode: 'ArrowDown'
            });
        });
    });

    // ESC to return home
    globalShortcut.register('Escape', () => {
        if (appWindow && !appWindow.isDestroyed()) {
            appWindow.close();
            appWindow = null;
            mainWindow.focus();
        }
    });

    // Volume shortcuts
    globalShortcut.register('[', () => {
        mainWindow.webContents.send('volume-control', 'decrease');
    });

    globalShortcut.register(']', () => {
        mainWindow.webContents.send('volume-control', 'increase');
    });
}

app.whenReady().then(createWindow);

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
