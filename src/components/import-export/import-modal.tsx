'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, CheckCircle, Upload, Download, FileText } from 'lucide-react';

interface CSVRow {
  [key: string]: string;
}

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (contacts: CSVRow[], mapping: Record<string, string>) => Promise<void>;
}

export function ImportModal({ open, onClose, onImport }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [previewRows, setPreviewRows] = useState<CSVRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const REQUIRED_FIELDS = [
    { key: 'nombre', label: 'Nombre', required: true },
    { key: 'ruc', label: 'RUC', required: true },
    { key: 'email', label: 'Email', required: false },
    { key: 'telefono', label: 'Teléfono', required: false },
    { key: 'direccion', label: 'Dirección', required: false },
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    parseCSV(selectedFile);
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        alert('El archivo CSV debe tener al menos un encabezado y una fila de datos');
        return;
      }

      const csvHeaders = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const rows: CSVRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const row: CSVRow = {};
        csvHeaders.forEach((header, index) => {
          row[header] = values[index]?.replace(/"/g, '').trim() || '';
        });
        rows.push(row);
      }

      setHeaders(csvHeaders);
      setCsvData(rows);
      setPreviewRows(rows.slice(0, 5));
      
      // Auto-mapeo inicial
      const initialMapping: Record<string, string> = {};
      REQUIRED_FIELDS.forEach(field => {
        const matchedHeader = csvHeaders.find(h => 
          h.toLowerCase().includes(field.key) || 
          h.toLowerCase().includes(field.label.toLowerCase())
        );
        if (matchedHeader) {
          initialMapping[field.key] = matchedHeader;
        }
      });
      setMapping(initialMapping);
    };
    reader.readAsText(file);
  };

  const handleMappingChange = (fieldKey: string, headerName: string) => {
    setMapping(prev => ({
      ...prev,
      [fieldKey]: headerName
    }));
  };

  const isMappingValid = () => {
    return REQUIRED_FIELDS
      .filter(f => f.required)
      .every(f => mapping[f.key]);
  };

  const handleDownloadTemplate = () => {
    const template = 'Nombre,RUC,Email,Teléfono,Dirección\nJuan Pérez,1234567890,juan@empresa.com,0991234567,Calle Principal 123\nMaría García,0987654321,maria@empresa.com,0998765432,Avenida Central 456';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_importacion.csv';
    a.click();
  };

  const handleImport = async () => {
    if (!isMappingValid()) {
      alert('Por favor completa el mapeo de los campos requeridos');
      return;
    }

    setIsProcessing(true);
    try {
      await onImport(csvData, mapping);
      handleClose();
    } catch (error) {
      console.error('Error al importar:', error);
      alert('Error al importar contactos');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setCsvData([]);
    setHeaders([]);
    setMapping({});
    setPreviewRows([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar Contactos desde CSV</DialogTitle>
          <DialogDescription>
            Sube un archivo CSV, verifica el mapeo de columnas e importa tus contactos
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {!file ? (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Arrastra tu archivo CSV aquí</h3>
              <p className="text-sm text-muted-foreground mb-4 text-center">
                o haz clic para seleccionarlo
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                >
                  Seleccionar Archivo
                </Button>
                <Button
                  onClick={handleDownloadTemplate}
                  variant="ghost"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Plantilla
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {csvData.length} registros encontrados
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFile(null)}
                >
                  Cambiar
                </Button>
              </div>

              <div className="space-y-3 overflow-hidden flex-1 flex flex-col">
                <h4 className="font-medium">Mapeo de Campos</h4>
                <ScrollArea className="flex-1">
                  <div className="space-y-3 pr-4">
                    {REQUIRED_FIELDS.map((field) => (
                      <div key={field.key} className="space-y-1">
                        <Label className="flex items-center gap-2">
                          {field.label}
                          {field.required && <span className="text-destructive">*</span>}
                        </Label>
                        <select
                          value={mapping[field.key] || ''}
                          onChange={(e) => handleMappingChange(field.key, e.target.value)}
                          className="w-full p-2 border rounded-md text-sm"
                        >
                          <option value="">Seleccionar columna...</option>
                          {headers.map(header => (
                            <option key={header} value={header}>
                              {header}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {isMappingValid() ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                  <span className="text-sm">
                    {isMappingValid() 
                      ? 'Mapeo completo' 
                      : 'Completa los campos requeridos'}
                  </span>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted p-2 text-sm font-medium">
                    Vista Previa (primeros 5 registros)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          {headers.map(header => (
                            <th key={header} className="p-2 text-left font-medium">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, idx) => (
                          <tr key={idx} className="border-b">
                            {headers.map(header => (
                              <td key={header} className="p-2">
                                {row[header] || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          {file && (
            <Button
              onClick={handleImport}
              disabled={!isMappingValid() || isProcessing}
            >
              {isProcessing ? 'Importando...' : `Importar ${csvData.length} Contactos`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
