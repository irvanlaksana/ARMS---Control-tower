// GasApi.ts - Bridge to Google Apps Script backend
declare const google: any;

/**
 * Cek apakah aplikasi saat ini berjalan langsung di dalam lingkungan Google Apps Script Web App
 */
export const isRunningInGas = (): boolean => {
  return typeof google !== 'undefined' && Boolean(google?.script?.run);
};

/**
 * Simulasi lokal ketika aplikasi dibuka di luar lingkungan GAS (misal: localhost, preview AI Studio)
 * agar user tidak mengalami error crash saat mencoba tombol sebelum melakukan copy-paste ke GAS.
 */
function handleLocalGasSimulation(functionName: string, args: any[]): any {
  console.info(`[GAS Local Simulation] Memanggil fungsi '${functionName}' dalam mode pratinjau browser.`);

  if (functionName === 'checkAndPrepareSheets' || functionName === 'initSpreadsheetStructure') {
    const spreadsheetId = args[0] || 'arms-control-tower';
    const tabMap = args[1] || {};
    const tabs = Object.values(tabMap) as string[];
    return {
      success: true,
      spreadsheetId,
      createdSheets: tabs.length > 0 ? tabs : ['Users', 'Clients', 'Personnel', 'Cases', 'Settings'],
      existingSheets: [],
      totalSheets: tabs.length || 30,
      isSimulation: true,
      message: 'Mode Pratinjau: Struktur 30 sheet dan kolom berhasil diverifikasi secara lokal. Untuk deploy aktif ke Spreadsheet Google asli, buka Web App di Google Apps Script.',
    };
  }

  if (functionName === 'syncSheets') {
    const data = args[1] || {};
    const tabMap = args[2] || {};
    const counts: Record<string, number> = {};
    const updatedTabs: string[] = [];

    for (const key of Object.keys(data)) {
      const records = data[key];
      const count = Array.isArray(records) ? records.length : (records ? 1 : 0);
      counts[key] = count;
      updatedTabs.push(tabMap[key] || key);
    }

    try {
      // Simpan backup di localStorage lokal
      localStorage.setItem('ARMS_SIMULATED_SHEETS_DATA', JSON.stringify({
        syncedAt: new Date().toISOString(),
        counts,
      }));
    } catch {
      // Abaikan jika quota storage browser penuh
    }

    return {
      success: true,
      updatedTabs,
      counts,
      syncedAt: new Date().toISOString(),
      isSimulation: true,
      message: 'Mode Pratinjau: Data berhasil disimulasikan dan dipetakan ke kolom-kolom sheet. Jalankan di Google Apps Script untuk menyimpan langsung ke Google Spreadsheet Anda.',
    };
  }

  if (functionName === 'fetchSheets') {
    return {
      success: true,
      data: null,
      provider: 'local-simulation',
      isSimulation: true,
    };
  }

  if (functionName === 'ensureDriveFolder') {
    const folderName = args[0] || 'FOLDER';
    return {
      success: true,
      id: `SIMULATED_GDRIVE_${folderName}_${Date.now()}`,
      url: 'https://drive.google.com',
      isSimulation: true,
    };
  }

  if (functionName === 'uploadToDrive') {
    const base64Data = args[0];
    const filename = args[1] || 'file.jpg';
    return {
      success: true,
      id: `SIM_FILE_${Date.now()}`,
      url: typeof base64Data === 'string' && base64Data.startsWith('data:') ? base64Data : 'https://drive.google.com',
      webViewLink: 'https://drive.google.com',
      directViewUrl: 'https://drive.google.com',
      fileName: filename,
      isSimulation: true,
    };
  }

  return {
    success: true,
    isSimulation: true,
    result: null,
  };
}

/**
 * Call a Google Apps Script function
 * @param functionName The name of the function in Code.gs
 * @param args Arguments to pass to the function
 */
export const callGasFunction = async <T = any>(functionName: string, ...args: any[]): Promise<T> => {
  return new Promise((resolve, reject) => {
    if (isRunningInGas()) {
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result && result.success === false) {
            reject(new Error(result.error || 'GAS Function Failed'));
          } else {
            resolve(result);
          }
        })
        .withFailureHandler((error: Error) => {
          reject(error);
        })
        [functionName](...args);
    } else {
      // Fallback cerdas untuk pratinjau browser / AI Studio environment
      try {
        const simResult = handleLocalGasSimulation(functionName, args);
        resolve(simResult as T);
      } catch (err: any) {
        reject(err);
      }
    }
  });
};
