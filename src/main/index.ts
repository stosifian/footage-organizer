import { app, shell, BrowserWindow, Menu, protocol } from 'electron'
import { join } from 'path'
import path from 'path'
import fs from 'fs'

// Must be called before app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'footage', privileges: { secure: true, standard: true, stream: true, supportFetchAPI: true } }
])
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc/handlers'
import windowStateKeeper from 'electron-window-state'

let mainWindow: BrowserWindow | null = null

function buildMenu(win: BrowserWindow): void {
  const send = (channel: string) => () => win.webContents.send(channel)
  const template: Electron.MenuItemConstructorOptions[] = [
    { role: 'appMenu' },
    {
      label: 'File',
      submenu: [
        { label: 'Open Directory…', accelerator: 'CmdOrCtrl+O', click: send('menu-open-directory') },
        { label: 'Re-scan', accelerator: 'CmdOrCtrl+R', click: send('menu-rescan') },
        { type: 'separator' },
        { label: 'Export as CSV…', accelerator: 'CmdOrCtrl+E', click: send('menu-export-csv') },
        { label: 'Export as JSON…', accelerator: 'CmdOrCtrl+Shift+E', click: send('menu-export-json') },
        { label: 'Export as FCPXML…', click: send('menu-export-fcpxml') },
        { type: 'separator' },
        { label: 'Settings…', accelerator: 'CmdOrCtrl+,', click: send('menu-open-settings') }
      ]
    },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        ...(is.dev
          ? [
              { role: 'toggleDevTools' as const },
              { type: 'separator' as const }
            ]
          : []),
        { role: 'togglefullscreen' as const }
      ]
    },
    { role: 'windowMenu' }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function createWindow(): void {
  const mainWindowState = windowStateKeeper({ defaultWidth: 1400, defaultHeight: 900 })

  mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    minWidth: 900,
    minHeight: 600,
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
    backgroundColor: '#0f0f0f',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindowState.manage(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.footage-organizer')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  protocol.handle('footage', async (request) => {
    const filePath = decodeURIComponent(new URL(request.url).pathname)
    const ext = path.extname(filePath).toLowerCase()
    const mimeTypes: Record<string, string> = {
      '.mov': 'video/quicktime',
      '.mp4': 'video/mp4',
      '.m4v': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mkv': 'video/x-matroska',
      '.mxf': 'application/mxf',
      '.mts': 'video/mp2t',
      '.m2ts': 'video/mp2t',
      '.webm': 'video/webm',
    }
    const contentType = mimeTypes[ext] ?? 'video/mp4'

    try {
      const data = await fs.promises.readFile(filePath)
      const fileSize = data.length
      const rangeHeader = request.headers.get('range')

      if (rangeHeader) {
        const match = rangeHeader.match(/bytes=(\d+)-(\d*)/)
        if (match) {
          const start = parseInt(match[1], 10)
          const end = match[2] ? parseInt(match[2], 10) : fileSize - 1
          return new Response(data.slice(start, end + 1), {
            status: 206,
            headers: {
              'Content-Range': `bytes ${start}-${end}/${fileSize}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': String(end - start + 1),
              'Content-Type': contentType,
            }
          })
        }
      }

      return new Response(data, {
        status: 200,
        headers: {
          'Content-Length': String(fileSize),
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
        }
      })
    } catch (err) {
      console.error('[footage protocol] failed to serve:', filePath, err)
      return new Response('File not found', { status: 404 })
    }
  })

  registerIpcHandlers(() => mainWindow)
  createWindow()
  buildMenu(mainWindow!)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
