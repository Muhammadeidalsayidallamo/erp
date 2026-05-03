export interface ImportResult {
  success: boolean;
  storesImported: string[];
  errors: string[];
}

export function exportAllData(): void {
  const data: Record<string, string> = {};
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('ppf-') || key.startsWith('protex-'))) {
      data[key] = localStorage.getItem(key) || '';
    }
  }

  const backupObject = {
    version: '2.0',
    exportDate: new Date().toISOString(),
    stores: data,
  };

  const blob = new Blob([JSON.stringify(backupObject, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  
  const today = new Date().toISOString().split('T')[0];
  a.download = `protex-backup-${today}.json`;
  a.click();
  
  URL.revokeObjectURL(url);

  // Save the last export date
  localStorage.setItem('protex-last-backup-date', backupObject.exportDate);
}

export async function importAllData(file: File): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    storesImported: [],
    errors: [],
  };

  if (!file) {
    result.errors.push('No file provided');
    return result;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const backupObject = JSON.parse(content);

        // Validate version and structure
        if (!backupObject || backupObject.version !== '2.0' || !backupObject.stores) {
          result.errors.push('ملف النسخة الاحتياطية غير صالح أو من إصدار قديم جداً.');
          return resolve(result);
        }

        const confirmImport = window.confirm(
          `تم اكتشاف نسخة احتياطية بتاريخ:\n${new Date(backupObject.exportDate).toLocaleString('ar-EG')}\n\nتحذير: الاستيراد سيمسح البيانات الحالية ويستبدلها بهذه النسخة. هل أنت متأكد من الاستمرار؟`
        );

        if (!confirmImport) {
          result.errors.push('تم إلغاء عملية الاستيراد بواسطة المستخدم.');
          return resolve(result);
        }

        const stores = backupObject.stores;
        for (const key in stores) {
          if (key.startsWith('ppf-') || key.startsWith('protex-')) {
            localStorage.setItem(key, stores[key]);
            result.storesImported.push(key);
          }
        }

        result.success = true;
        resolve(result);
      } catch (err: any) {
        result.errors.push(`حدث خطأ أثناء قراءة الملف: ${err?.message || 'Unknown error'}`);
        resolve(result);
      }
    };

    reader.onerror = () => {
      result.errors.push('حدث خطأ أثناء تحميل الملف.');
      resolve(result);
    };

    reader.readAsText(file);
  });
}

export function clearAllData(): void {
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('ppf-') || key.startsWith('protex-'))) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(key => localStorage.removeItem(key));
}
