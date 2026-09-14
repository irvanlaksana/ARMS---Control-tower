/**
 * ============================================================================
 *  ARMS — Control Tower :: INTEGRASI SURAT TUGAS / GENERATOR (Apps Script)
 * ============================================================================
 *  Menggantikan endpoint server:
 *    POST /api/surat/create-issue    -> SURAT_CREATE_ISSUE
 *    POST /api/surat/open-generator  -> SURAT_OPEN_GENERATOR
 *
 *  Token GitHub dibaca dari Script Properties (GITHUB_TOKEN) atau dari tab
 *  Settings spreadsheet aktif (key: githubToken) — jadi tidak perlu env server.
 * ============================================================================
 */

var SURAT_GITHUB_OWNER_ = 'irvanlaksana';
/** Repo generator surat web (sumber model LetterData + BastData). */
var SURAT_GITHUB_REPO_ = 'generator-surat-';
/** UI generator surat web yang dipakai tombol "Kirim ke Generator". */
var SURAT_GENERATOR_BASE_ = 'https://generator-surat-beige.vercel.app';
var SURAT_PAYLOAD_VERSION_ = 2;
var SURAT_PAYLOAD_SOURCE_ = 'ARMS-CONTROL-TOWER';
/** Batas panjang payload pada query string; lebih dari ini dipindah ke hash. */
var SURAT_MAX_QUERY_PAYLOAD_ = 1400;

function githubToken_() {
  try {
    var fromProps = scriptProps_().getProperty('GITHUB_TOKEN');
    if (fromProps) return String(fromProps).trim();
  } catch (e) { /* lanjut */ }
  try {
    var target = resolveSpreadsheet_('');
    var settings = readSettingsObject_(target.ss, SETTINGS_TAB_);
    if (settings.githubToken) return String(settings.githubToken).trim();
  } catch (e2) { /* lanjut */ }
  return '';
}

/** POST /api/surat/create-issue */
function suratCreateIssueHandler_(req) {
  var token = githubToken_();
  if (!token) {
    return {
      success: false,
      provider: ARMS_PROVIDER,
      httpStatus: 500,
      error: 'GITHUB_TOKEN belum diset. Isi Script Properties (Project Settings -> Script Properties -> GITHUB_TOKEN) atau key "githubToken" pada tab Settings spreadsheet aktif.'
    };
  }

  var debtor = req.debtor;
  var personnel = req.personnel;
  if (!debtor || !personnel) {
    return fail_('Missing debtor or personnel data in request body', 400);
  }

  var skNumber = req.skNumber || req.skId || 'new';
  var skId = req.skId || req.skNumber || '';
  var issueTitle = 'SK: ' + skNumber + ' - ' + (debtor.debtorName || debtor.name || 'Debtor');

  var issueBody = [
    'Auto-synced from ARMS - Control Tower (Google Apps Script)',
    '',
    '**SK ID / Number:** ' + skId,
    '',
    '**Debtor (case data):**',
    '',
    '```json',
    JSON.stringify(debtor, null, 2),
    '```',
    '',
    '**Personnel (penerima tugas):**',
    '',
    '```json',
    JSON.stringify(personnel, null, 2),
    '```',
    '',
    '**Drive Document URL (if any):** ' + (req.driveDocumentUrl || ''),
    '',
    generatorIssueSection_(req),
    '',
    '---',
    '*(This issue was created automatically by ARMS - Control Tower to seed generator-surat- with debtor & personnel data.)*'
  ].join('\n');

  try {
    var response = UrlFetchApp.fetch('https://api.github.com/repos/' + SURAT_GITHUB_OWNER_ + '/' + SURAT_GITHUB_REPO_ + '/issues', {
      method: 'post',
      contentType: 'application/json',
      muteHttpExceptions: true,
      headers: {
        'Authorization': 'token ' + token,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'ARMS-Control-Tower-GAS'
      },
      payload: JSON.stringify({ title: issueTitle, body: issueBody })
    });

    var code = response.getResponseCode();
    var json = {};
    try { json = JSON.parse(response.getContentText()); } catch (e) { json = {}; }

    if (code < 200 || code >= 300) {
      return {
        success: false,
        provider: ARMS_PROVIDER,
        httpStatus: code,
        error: json.message || ('GitHub API error (HTTP ' + code + ')'),
        details: json
      };
    }

    return { success: true, provider: ARMS_PROVIDER, issueUrl: json.html_url, issueNumber: json.number };
  } catch (err) {
    return {
      success: false,
      provider: ARMS_PROVIDER,
      httpStatus: 500,
      error: 'Gagal membuat GitHub Issue: ' + errorMessage_(err) + '. Pastikan Apps Script boleh mengakses api.github.com.'
    };
  }
}

/* ======================================================================== *
 *  PAYLOAD GENERATOR WEB (LetterData + BastData — repo generator-surat-)
 * ======================================================================== */

/** Ambil string pertama yang tidak kosong dari beberapa key objek. */
function suratPick_(obj, keys) {
  if (!obj) return '';
  for (var i = 0; i < keys.length; i++) {
    var v = obj[keys[i]];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

/** Tanggal ISO yyyy-mm-dd (dipakai <input type="date"> generator). */
function suratIsoDate_(value, fallbackDays) {
  var d = null;
  if (value) {
    var normalized = String(value).replace(/[.\/]/g, '-');
    d = new Date(normalized);
    if (isNaN(d.getTime())) {
      var longMatch = normalized.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
      if (longMatch) {
        var months = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
        var mi = months.indexOf(longMatch[2].toLowerCase());
        if (mi >= 0) {
          var mm = ('0' + (mi + 1)).slice(-2);
          var dd = ('0' + longMatch[1]).slice(-2);
          return longMatch[3] + '-' + mm + '-' + dd;
        }
      }
      d = null;
    }
  }
  if (!d) {
    d = new Date();
    d.setTime(d.getTime() + (fallbackDays || 0) * 86400000);
  }
  var y = d.getFullYear();
  var m = ('0' + (d.getMonth() + 1)).slice(-2);
  var day = ('0' + d.getDate()).slice(-2);
  return y + '-' + m + '-' + day;
}

/** Normalisasi daftar lampiran jadi AttachmentData { url, width, height }. */
function suratAttachments_(input) {
  if (!input || !input.length) return [];
  var out = [];
  for (var i = 0; i < input.length; i++) {
    var item = input[i];
    if (typeof item === 'string' && item) {
      out.push({ url: item, width: 600, height: 380 });
    } else if (item && typeof item.url === 'string' && item.url) {
      out.push({ url: item.url, width: Number(item.width) || 600, height: Number(item.height) || 380 });
    }
  }
  return out;
}

/**
 * Rakit payload generator (LetterData + BastData).
 * Bila request sudah membawa `payload` dari frontend, dipakai apa adanya.
 */
function generatorPayloadFromRequest_(req) {
  var incoming = req.payload;
  if (incoming && typeof incoming === 'object' && (incoming.letter || incoming.bast)) {
    return {
      source: incoming.source || SURAT_PAYLOAD_SOURCE_,
      version: Number(incoming.version) || SURAT_PAYLOAD_VERSION_,
      generatedAt: incoming.generatedAt || new Date().toISOString(),
      docType: incoming.docType === 'bast' ? 'bast' : 'surat_tugas',
      paperSize: ['f4', 'a4', 'legal', 'letter'].indexOf(incoming.paperSize) >= 0 ? incoming.paperSize : 'f4',
      letter: incoming.letter || {},
      bast: incoming.bast || {},
      meta: incoming.meta || {}
    };
  }

  var debtor = req.debtor || {};
  var personnel = req.personnel || {};
  var issued = suratIsoDate_(req.issuedDate, 0);
  var expiry = suratIsoDate_(req.expiryDate, 3);

  var letter = {
    kopImage: null,
    kopImageHeight: 120,
    kopImageFit: 'contain',
    kopImageAlign: 'center',
    kopImageOffsetY: 0,
    kopImageOffsetX: 0,
    kopImageMarginBottom: 32,
    kopCompanyName: suratPick_(req, ['companyName']),
    letterNumber: suratPick_(req, ['skNumber', 'letterNumber']),
    assignerName: suratPick_(req, ['repName', 'assignerName', 'krediturName']),
    assignerPosition: suratPick_(req, ['repTitle', 'assignerPosition']),
    assigneeName: suratPick_(personnel, ['fullName', 'personnelName', 'name']),
    assigneePosition: suratPick_(personnel, ['position', 'jabatan']) || 'Petugas Penagihan',
    clientName: suratPick_(req, ['clientName', 'krediturName', 'leasingName']),
    customerContract: suratPick_(req, ['contractNo', 'customerContract']) || suratPick_(debtor, ['contractNo', 'multifinanceContractNo']),
    customerName: suratPick_(debtor, ['debtorName', 'fullName', 'name', 'customerName']),
    customerAddress: suratPick_(debtor, ['address', 'addressCurrent', 'addressKtp', 'debtorAddress']),
    customerAddressDetail: suratPick_(debtor, ['addressDetail']),
    customerKabupaten: suratPick_(debtor, ['kabupaten']),
    customerKecamatan: suratPick_(debtor, ['kecamatan']),
    customerKelurahan: suratPick_(debtor, ['kelurahan']),
    customerDueDate: suratIsoDate_(suratPick_(debtor, ['dueDate']) || req.dueDate, 0),
    customerInstallment: suratPick_(req, ['installment']) || suratPick_(debtor, ['installmentAmount']),
    customerTotalInstallment: suratPick_(req, ['totalInstallment']) || suratPick_(debtor, ['totalInstallment']),
    customerPenalty: suratPick_(req, ['penalty']) || suratPick_(debtor, ['penaltyAmount']),
    customerUnpaidInstallmentCount: suratPick_(req, ['unpaidInstallmentCount']),
    attachments: suratAttachments_(req.attachments),
    vehicleBrand: suratPick_(req, ['vehicleMerk']) || suratPick_(debtor, ['vehicleMerkType', 'brandModel']),
    vehiclePlate: suratPick_(req, ['vehiclePoliceNo']) || suratPick_(debtor, ['vehiclePoliceNo', 'policeNoVIN']),
    validFrom: issued,
    validTo: expiry,
    signPlaceDate: suratPick_(req, ['signPlaceDate'])
  };

  var bast = {
    jenis: String(req.jenis || 'roda4') === 'roda2' ? 'roda2' : 'roda4',
    nomorBast: suratPick_(req, ['nomorBast', 'skNumber']),
    nomorPenyerahan: suratPick_(req, ['nomorPenyerahan', 'skNumber']),
    perusahaan: suratPick_(req, ['companyName']),
    cabang: suratPick_(req, ['city', 'cabang']),
    alamat: suratPick_(req, ['companyAddress']),
    telepon: suratPick_(req, ['companyPhone']),
    petugasNama: letter.assigneeName,
    petugasNik: suratPick_(personnel, ['nikKtp', 'nik']),
    petugasJabatan: suratPick_(personnel, ['position', 'jabatan']) || 'Petugas Remedial / Eksekusi Penagihan',
    petugasHp: suratPick_(personnel, ['phoneNumber', 'phone', 'hp']),
    debiturNama: letter.customerName,
    debiturNik: suratPick_(debtor, ['nikKtp', 'debtorNik', 'nik']),
    debiturAlamat: letter.customerAddress,
    debiturHp: suratPick_(debtor, ['phone', 'phoneNumber']),
    nomorKontrak: letter.customerContract,
    krediturLeasing: letter.clientName,
    kendaraanMerk: letter.vehicleBrand,
    kendaraanType: '',
    kendaraanTahun: suratPick_(req, ['vehicleYear']),
    kendaraanWarna: suratPick_(req, ['vehicleColor']),
    kendaraanNoPol: letter.vehiclePlate,
    kendaraanNoRangka: suratPick_(req, ['chassisNo', 'noRangka']),
    kendaraanNoMesin: suratPick_(req, ['engineNo', 'noMesin']),
    kendaraanBpkb: suratPick_(req, ['bpkb']),
    kendaraanStnk: suratPick_(req, ['stnk']),
    kendaraanOdometer: suratPick_(req, ['odometer']),
    kendaraanBahanBakar: suratPick_(req, ['fuel']),
    kendaraanKondisiMesin: suratPick_(req, ['engineCondition']),
    kendaraanKondisiBodi: suratPick_(req, ['bodyCondition']),
    checklist: {},
    kota: suratPick_(req, ['city']),
    tanggal: '',
    saksi1Nama: letter.assignerName,
    saksi1Jabatan: letter.assignerPosition,
    saksi2Nama: letter.assigneeName,
    saksi2Jabatan: letter.assigneePosition,
    catatanKhusus: suratPick_(req, ['notes', 'catatanKhusus'])
  };

  return {
    source: SURAT_PAYLOAD_SOURCE_,
    version: SURAT_PAYLOAD_VERSION_,
    generatedAt: new Date().toISOString(),
    docType: req.docType === 'bast' ? 'bast' : 'surat_tugas',
    paperSize: ['f4', 'a4', 'legal', 'letter'].indexOf(req.paperSize) >= 0 ? req.paperSize : 'f4',
    letter: letter,
    bast: bast,
    meta: {
      armsSkId: req.skId || '',
      armsSkNumber: req.skNumber || '',
      driveDocumentUrl: req.driveDocumentUrl || '',
      note: 'Payload dirakit backend Apps Script ARMS Control Tower.'
    }
  };
}

/** Buang lampiran/kop ber-data-URL agar URL tidak terlalu panjang. */
function generatorCompactForUrl_(payload) {
  var letter = payload.letter || {};
  var attachments = [];
  var src = letter.attachments || [];
  for (var i = 0; i < src.length; i++) {
    var a = src[i];
    if (a && typeof a.url === 'string' && !/^(data:|blob:)/i.test(a.url)) attachments.push(a);
  }
  return {
    source: payload.source,
    version: payload.version,
    generatedAt: payload.generatedAt,
    docType: payload.docType,
    paperSize: payload.paperSize,
    letter: Object.assign({}, letter, {
      kopImage: typeof letter.kopImage === 'string' && /^(data:|blob:)/i.test(letter.kopImage) ? null : letter.kopImage,
      attachments: attachments
    }),
    bast: Object.assign({}, payload.bast || {}, {
      catatanKhusus: String((payload.bast || {}).catatanKhusus || '').slice(0, 400)
    }),
    meta: payload.meta || {}
  };
}

/**
 * Bagian body GitHub Issue berisi tautan generator + payload LetterData/BastData
 * (paritas dengan server.ts). Dibuat aman: kegagalan tidak memblokir pembuatan issue.
 */
function generatorIssueSection_(req) {
  try {
    var payload = generatorPayloadFromRequest_(req);
    var compact = generatorCompactForUrl_(payload);
    var encoded = Utilities.base64EncodeWebSafe(Utilities.newBlob(JSON.stringify(compact), 'application/json').getBytes());
    var base = SURAT_GENERATOR_BASE_.replace(/\/+$/, '');
    var url = base + '/?src=arms&pv=' + payload.version + '&docType=' + payload.docType +
              '&tab=' + payload.docType + '&paper=' + payload.paperSize + '#payload=' + encoded;
    return [
      '**Generator link (payload LetterData + BastData):** ' + url.slice(0, 4000),
      '',
      '**Payload JSON:**',
      '',
      '```json',
      JSON.stringify(payload, null, 2).slice(0, 12000),
      '```'
    ].join('\n');
  } catch (e) {
    return '**Generator link:** (gagal dirakit: ' + errorMessage_(e) + ')';
  }
}

/**
 * POST /api/surat/open-generator
 * Mengembalikan URL generator-surat-beige.vercel.app yang membawa payload
 * LetterData + BastData (base64url) + parameter datar sebagai fallback.
 */
function suratOpenGeneratorHandler_(req) {
  var hasPayload = req.payload && typeof req.payload === 'object' && (req.payload.letter || req.payload.bast);
  if (!hasPayload && (!req.debtor || !req.personnel)) {
    return fail_('Missing debtor or personnel data in request body', 400);
  }

  try {
    var payload = generatorPayloadFromRequest_(req);
    var compact = generatorCompactForUrl_(payload);
    var json = JSON.stringify(compact);
    var encoded = Utilities.base64EncodeWebSafe(Utilities.newBlob(json, 'application/json').getBytes());
    var base = String(req.generatorBase || SURAT_GENERATOR_BASE_).replace(/\/+$/, '');

    var params = [
      'src=arms',
      'pv=' + payload.version,
      'docType=' + payload.docType,
      'tab=' + payload.docType,
      'paper=' + payload.paperSize
    ];

    var letter = compact.letter || {};
    var bast = compact.bast || {};
    var flat = {
      letterNumber: letter.letterNumber,
      assignerName: letter.assignerName,
      assignerPosition: letter.assignerPosition,
      assigneeName: letter.assigneeName,
      assigneePosition: letter.assigneePosition,
      clientName: letter.clientName,
      customerName: letter.customerName,
      customerContract: letter.customerContract,
      customerDueDate: letter.customerDueDate,
      vehicleBrand: letter.vehicleBrand,
      vehiclePlate: letter.vehiclePlate,
      validFrom: letter.validFrom,
      validTo: letter.validTo,
      nomorBast: bast.nomorBast,
      nomorPenyerahan: bast.nomorPenyerahan,
      petugasNama: bast.petugasNama,
      debiturNama: bast.debiturNama,
      nomorKontrak: bast.nomorKontrak,
      krediturLeasing: bast.krediturLeasing
    };
    Object.keys(flat).forEach(function (key) {
      if (flat[key]) params.push(key + '=' + encodeURIComponent(flat[key]));
    });

    var queryOnly = base + '/?' + params.join('&');
    var payloadInHash = encoded.length > SURAT_MAX_QUERY_PAYLOAD_;
    var url = payloadInHash
      ? queryOnly + '#payload=' + encoded
      : queryOnly + '&payload=' + encodeURIComponent(encoded);

    return {
      success: true,
      provider: ARMS_PROVIDER,
      url: url,
      generatorBase: SURAT_GENERATOR_BASE_,
      generatorRepo: 'https://github.com/' + SURAT_GITHUB_OWNER_ + '/' + SURAT_GITHUB_REPO_,
      docType: payload.docType,
      paperSize: payload.paperSize,
      payload: payload,
      encodedPayload: encoded,
      payloadInHash: payloadInHash,
      transport: [
        payloadInHash ? 'hash #payload' : 'query ?payload',
        'parameter datar',
        'postMessage ARMS_GENERATOR_PAYLOAD',
        'JSON (salin/unduh dari modul SK)'
      ]
    };
  } catch (err) {
    return { success: false, provider: ARMS_PROVIDER, httpStatus: 500, error: 'Failed creating generator link: ' + errorMessage_(err) };
  }
}
