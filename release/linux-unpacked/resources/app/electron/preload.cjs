const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  /** Execute a per-company database operation and return { data, error } */
  dbOp: (descriptor) => ipcRenderer.invoke('db-op', descriptor),

  /** Company management */
  companiesList:    ()       => ipcRenderer.invoke('companies-list'),
  companiesCreate:  (data)   => ipcRenderer.invoke('companies-create', data),
  companiesUpdate:  (data)   => ipcRenderer.invoke('companies-update', data),
  companiesDelete:  (id)     => ipcRenderer.invoke('companies-delete', id),
  companiesSaveLogo:(data)   => ipcRenderer.invoke('companies-save-logo', data),
  companiesGetLogo: (id)     => ipcRenderer.invoke('companies-get-logo', id),
});
