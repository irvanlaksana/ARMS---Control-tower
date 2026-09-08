// Indonesian Number to Words Converter (Terbilang)
export function angkaKeTerbilang(nilai: number): string {
  if (isNaN(nilai) || nilai === 0) return 'Nol';

  const bilangan = [
    '',
    'Satu',
    'Dua',
    'Tiga',
    'Empat',
    'Lima',
    'Enam',
    'Tujuh',
    'Delapan',
    'Sembilan',
    'Sepuluh',
    'Sebelas',
  ];

  function konversi(n: number): string {
    if (n < 12) {
      return bilangan[n];
    } else if (n < 20) {
      return `${bilangan[n - 10]} Belas`;
    } else if (n < 100) {
      const sisa = n % 10;
      return `${bilangan[Math.floor(n / 10)]} Puluh ${sisa > 0 ? konversi(sisa) : ''}`.trim();
    } else if (n < 200) {
      const sisa = n - 100;
      return `Seratus ${sisa > 0 ? konversi(sisa) : ''}`.trim();
    } else if (n < 1000) {
      const sisa = n % 100;
      return `${bilangan[Math.floor(n / 100)]} Ratus ${sisa > 0 ? konversi(sisa) : ''}`.trim();
    } else if (n < 2000) {
      const sisa = n - 1000;
      return `Seribu ${sisa > 0 ? konversi(sisa) : ''}`.trim();
    } else if (n < 1000000) {
      const sisa = n % 1000;
      return `${konversi(Math.floor(n / 1000))} Ribu ${sisa > 0 ? konversi(sisa) : ''}`.trim();
    } else if (n < 1000000000) {
      const sisa = n % 1000000;
      return `${konversi(Math.floor(n / 1000000))} Juta ${sisa > 0 ? konversi(sisa) : ''}`.trim();
    } else if (n < 1000000000000) {
      const sisa = n % 1000000000;
      return `${konversi(Math.floor(n / 1000000000))} Miliar ${sisa > 0 ? konversi(sisa) : ''}`.trim();
    } else {
      const sisa = n % 1000000000000;
      return `${konversi(Math.floor(n / 1000000000000))} Triliun ${sisa > 0 ? konversi(sisa) : ''}`.trim();
    }
  }

  const hasil = konversi(Math.abs(Math.floor(nilai)));
  return `${hasil} Rupiah`;
}
