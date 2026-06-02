import { DailyReport, WorkspaceConfig } from '../types';

/**
 * Find or create a specific folder in Google Drive
 */
async function findOrCreateFolder(token: string, folderName: string): Promise<string> {
  const query = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`;
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Gagal memeriksa folder di Drive');
    const data = await res.json();

    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }

    // Create the folder
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    if (!createRes.ok) throw new Error('Gagal membuat folder baru di Drive');
    const createData = await createRes.json();
    return createData.id;
  } catch (error) {
    console.error('Error with folder operations:', error);
    throw error;
  }
}

/**
 * Initialize the spreadsheet headers
 */
async function initializeHeaders(token: string, spreadsheetId: string): Promise<void> {
  const headers = [
    'ID',
    'Tanggal',
    'Jam',
    'Nama Tugas',
    'Deskripsi Progres',
    'Link Foto',
    'ID Foto Google Drive',
    'Nama Karyawan',
    'Email Karyawan',
    'Status'
  ];

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:J1?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [headers],
    }),
  });

  if (!res.ok) {
    throw new Error('Gagal membuat header pada Spreadsheet');
  }
}

/**
 * Main Setup function to locate or build the workspace database elements
 */
export async function findOrCreateDatabase(token: string): Promise<WorkspaceConfig> {
  const query = `mimeType = 'application/vnd.google-apps.spreadsheet' and name = 'Laporan Kinerja Harian (Database)' and trashed = false`;
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`;

  try {
    // 1. Locate the Spreadsheet
    const res = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error('Tidak dapat terhubung ke Google Drive API. Harap periksa otorisasi.');
    }
    const data = await res.json();

    let spreadsheetId = '';
    let spreadsheetUrl = '';

    if (data.files && data.files.length > 0) {
      spreadsheetId = data.files[0].id;
      spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    } else {
      // Create new Spreadsheet
      const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: {
            title: 'Laporan Kinerja Harian (Database)',
          },
        }),
      });

      if (!createRes.ok) {
        throw new Error('Batas API terlampaui atau gagal membuat Spreadsheet baru.');
      }
      const createData = await createRes.json();
      spreadsheetId = createData.spreadsheetId;
      spreadsheetUrl = createData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

      // Set headers
      await initializeHeaders(token, spreadsheetId);
    }

    // 2. Find or Create Folder for report images
    const folderId = await findOrCreateFolder(token, 'Laporan Kinerja Harian (Foto Bukti)');

    return {
      spreadsheetId,
      spreadsheetUrl,
      folderId,
      isInitializing: false,
      error: null,
    };
  } catch (err: any) {
    console.error('Database setup error:', err);
    return {
      spreadsheetId: null,
      spreadsheetUrl: null,
      folderId: null,
      isInitializing: false,
      error: err.message || 'Setup database gagal',
    };
  }
}

/**
 * Fetch reports from Google Sheets database
 */
export async function getReports(token: string, spreadsheetId: string): Promise<DailyReport[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A2:J1000`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      // If cells are completely empty, sheets api might return a 400 or empty response
      if (res.status === 400) {
        return [];
      }
      throw new Error('Gagal mengambil laporan dari Google Sheets');
    }

    const data = await res.json();
    if (!data.values) return [];

    return data.values.map((row: any[]): DailyReport => {
      return {
        id: row[0] || Math.random().toString(36).substr(2, 9),
        tanggal: row[1] || '',
        jam: row[2] || '',
        namaTugas: row[3] || '',
        deskripsiProgres: row[4] || '',
        linkFoto: row[5] || '',
        fileIdFoto: row[6] || '',
        namaKaryawan: row[7] || '',
        emailKaryawan: row[8] || '',
        status: (row[9] as any) || 'Selesai',
      };
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return [];
  }
}

/**
 * Add a daily performance report row to the spreadsheet
 */
export async function addReport(
  token: string,
  spreadsheetId: string,
  report: DailyReport
): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A:J:append?valueInputOption=USER_ENTERED`;

  const bodyData = {
    values: [
      [
        report.id || Math.random().toString(36).substr(2, 9),
        report.tanggal,
        report.jam,
        report.namaTugas,
        report.deskripsiProgres,
        report.linkFoto,
        report.fileIdFoto || '',
        report.namaKaryawan,
        report.emailKaryawan,
        report.status
      ]
    ]
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bodyData),
  });

  if (!res.ok) {
    const errMsg = await res.text();
    console.error('Append to sheet failed:', errMsg);
    throw new Error('Gagal menulis data ke Google Sheets');
  }
}

/**
 * Upload static / camera photo file to Google Drive and grant reader role to anyone
 */
export async function uploadPhotoToDrive(
  token: string,
  folderId: string | null,
  file: File
): Promise<{ fileId: string; webViewLink: string }> {
  try {
    const metadata = {
      name: `Laporan_Foto_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9_.-]/g, '_')}`,
      mimeType: file.type,
      parents: folderId ? [folderId] : undefined,
    };

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', file);

    const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink';
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!uploadRes.ok) {
      const errMsg = await uploadRes.text();
      console.error('File Upload failed:', errMsg);
      throw new Error('Gagal mengunggah foto ke Google Drive');
    }

    const uploadData = await uploadRes.json();
    const fileId = uploadData.id;

    // Grant read permission to anyone with link so managers can view it
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone',
        }),
      });
    } catch (permissionError) {
      console.warn('Could not set permissions, but file uploaded:', permissionError);
    }

    return {
      fileId,
      webViewLink: uploadData.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
    };
  } catch (error: any) {
    console.error('Upload photo error:', error);
    throw error;
  }
}
