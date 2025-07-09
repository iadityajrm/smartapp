const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');

let mainWindow;
let appWindow;

// ✅ Disable GPU acceleration (recommended on Raspberry Pi Lite)
app.disableHardwareAcceleration();

// ✅ Allow mic, speech, and media input in Electron Chromium
app.commandLine.appendSwitch('enable-speech-dispatcher');
app.commandLine.appendSwitch('enable-media-stream');
app.commandLine.appendSwitch('use-fake-ui-for-media-stream'); // auto-grant mic permissions

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        kiosk: true,              // Smart TV mode
        fullscreen: true,         // Extra backup
        frame: false,             // No borders or title bar
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false,                 // allow local file access
            allowRunningInsecureContent: true,  // useful for loading local/remote mixed content
            autoplayPolicy: 'no-user-gesture-required',
            sandbox: false
        },
    });

    // Load main home screen
    mainWindow.loadFile(path.join(__dirname, 'public', 'index.html'));

    // Handle app launch from front-end
    ipcMain.on('launch-app', (event, url) => {
        if (appWindow && !appWindow.isDestroyed()) {
            appWindow.close();
        }

        appWindow = new BrowserWindow({
            fullscreen: true,
            frame: false,
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

        // Inject CSS + focus + simulate key input
        appWindow.webContents.on('did-finish-load', () => {
            appWindow.webContents.insertCSS('body, * { cursor: none !important; }');
            appWindow.webContents.focus();
            appWindow.webContents.sendInputEvent({
                type: 'keyDown',
                keyCode: 'ArrowDown'
            });
        });
    });

    // ESC key returns to main menu
    globalShortcut.register('Escape', () => {
        if (appWindow && !appWindow.isDestroyed()) {
            appWindow.close();
            appWindow = null;
            mainWindow.focus();
        }
    });

    // Volume shortcuts (send event to renderer)
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
