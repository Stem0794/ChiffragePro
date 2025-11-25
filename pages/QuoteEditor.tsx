
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StorageService } from '../services/storageService';
import { Client, Project, Quote, QuoteItem, QuoteSection, QuoteStatus } from '../types';
import { ArrowLeft, Save, Trash2, Plus, Calendar, Download, GripVertical, PlusCircle, X, Calculator, FileText, FileSpreadsheet } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { sanitizeText } from '../services/sanitize';

const QuoteEditor: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Ref for PDF content extraction
  const pdfTemplateRef = useRef<HTMLDivElement>(null);

  // Data Sources
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allQuotes, setAllQuotes] = useState<Quote[]>([]);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Form State
  const [quote, setQuote] = useState<Quote>({
    id: crypto.randomUUID(),
    reference: `DEV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    version: 1,
    clientId: '',
    projectId: '',
    status: QuoteStatus.DRAFT,
    sections: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    validUntil: new Date(Date.now() + 86400000 * 30).toISOString(),
    totalAmount: 0,
    notes: '',
    hasVat: false,
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [loadedClients, loadedProjects] = await Promise.all([
          StorageService.getClients(),
          StorageService.getProjects()
        ]);
        setClients(loadedClients);
        setProjects(loadedProjects);
        const loadedQuotes = await StorageService.getQuotes();
        setAllQuotes(loadedQuotes);

        if (id && id !== 'new') {
          const existingQuote = (await StorageService.getQuotes()).find(q => q.id === id);
          if (existingQuote) {
            if (!existingQuote.sections && (existingQuote as any).items) {
               const legacyItems = (existingQuote as any).items;
               const migratedSection: QuoteSection = {
                   id: crypto.randomUUID(),
                   title: 'Prestations (Migré)',
                   items: legacyItems.map((li: any) => ({
                       id: li.id || crypto.randomUUID(),
                       description: li.description,
                       details: { [li.role]: li.quantity }
                   }))
               };
               setQuote({ ...existingQuote, hasVat: false, sections: [migratedSection], title: existingQuote.title || '' });
            } else {
               setQuote({ ...existingQuote, hasVat: existingQuote.hasVat ?? false, title: existingQuote.title || '' });
            }
          }
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const currentClientProjects = quote.clientId 
    ? projects.filter(p => p.clientId === quote.clientId) 
    : [];

  const availableRates = useMemo(() => {
      const client = clients.find(c => c.id === quote.clientId);
      const project = projects.find(p => p.id === quote.projectId);
      
      const rates: Record<string, number> = { ...client?.defaultTjms };
      if (project?.specificTjms) {
          Object.assign(rates, project.specificTjms);
      }
      return rates;
  }, [quote.clientId, quote.projectId, clients, projects]);

  const allRoles = Object.keys(availableRates);
  
  useEffect(() => {
    let total = 0;
    quote.sections.forEach(section => {
        section.items.forEach(item => {
            Object.entries(item.details).forEach(([role, days]) => {
                const rate = availableRates[role] || 0;
                total += Number(days) * rate;
            });
        });
    });
    setQuote(prev => ({ ...prev, totalAmount: total }));
  }, [quote.sections, availableRates]);

  // Handlers
  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setQuote(prev => ({ ...prev, clientId: e.target.value, projectId: '' }));
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setQuote(prev => ({ ...prev, projectId: e.target.value }));
  };
  
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setQuote(prev => ({ ...prev, status: e.target.value as QuoteStatus }));
  };

  const addSection = () => {
      setQuote(prev => ({
          ...prev,
          sections: [...prev.sections, { 
            id: crypto.randomUUID(), 
            title: 'Nouvelle Phase', 
            items: [{ id: crypto.randomUUID(), description: '', details: {} }] 
          }]
      }));
  };

  const deleteSection = (sectionId: string) => {
      if(!window.confirm("Supprimer cette catégorie et toutes ses lignes ?")) return;
      setQuote(prev => ({
          ...prev,
          sections: prev.sections.filter(s => s.id !== sectionId)
      }));
  };

  const updateSectionTitle = (sectionId: string, title: string) => {
      setQuote(prev => ({
          ...prev,
          sections: prev.sections.map(s => s.id === sectionId ? { ...s, title: sanitizeText(title) } : s)
      }));
  };

  const addItemToSection = (sectionId: string) => {
      setQuote(prev => ({
          ...prev,
          sections: prev.sections.map(s => {
              if (s.id === sectionId) {
                  return {
                      ...s,
                      items: [...s.items, { 
                          id: crypto.randomUUID(), 
                          description: '', 
                          details: {} 
                      }]
                  };
              }
              return s;
          })
      }));
  };

  const updateItem = (sectionId: string, itemId: string, field: 'description' | 'details', value: any) => {
      setQuote(prev => ({
          ...prev,
          sections: prev.sections.map(s => {
              if (s.id === sectionId) {
                  return {
                      ...s,
                      items: s.items.map(item => item.id === itemId ? { ...item, [field]: field === 'description' ? sanitizeText(value) : value } : item)
                  };
              }
              return s;
          })
      }));
  };
  
  const updateItemDetail = (sectionId: string, itemId: string, role: string, days: number) => {
      setQuote(prev => ({
          ...prev,
          sections: prev.sections.map(s => {
              if (s.id === sectionId) {
                  return {
                      ...s,
                      items: s.items.map(item => {
                          if (item.id === itemId) {
                              const newDetails = { ...item.details, [role]: days };
                              if (days === 0) delete newDetails[role]; 
                              return { ...item, details: newDetails };
                          }
                          return item;
                      })
                  };
              }
              return s;
          })
      }));
  };

  const deleteItem = (sectionId: string, itemId: string) => {
      setQuote(prev => ({
          ...prev,
          sections: prev.sections.map(s => {
              if (s.id === sectionId) {
                  return { ...s, items: s.items.filter(i => i.id !== itemId) };
              }
              return s;
          })
      }));
  };

  const duplicateSection = (sectionId: string) => {
      const section = quote.sections.find(s => s.id === sectionId);
      if (!section) return;

      const newSection: QuoteSection = {
          ...section,
          id: crypto.randomUUID(),
          title: `${section.title} (Copie)`,
          items: section.items.map(item => ({
              ...item,
              id: crypto.randomUUID(),
              details: { ...item.details }
          }))
      };

      const index = quote.sections.findIndex(s => s.id === sectionId);
      const newSections = [...quote.sections];
      newSections.splice(index + 1, 0, newSection);

      setQuote(prev => ({ ...prev, sections: newSections }));
  };

  const duplicateItem = (sectionId: string, itemId: string) => {
      setQuote(prev => ({
          ...prev,
          sections: prev.sections.map(s => {
              if (s.id === sectionId) {
                  const itemIndex = s.items.findIndex(i => i.id === itemId);
                  if (itemIndex === -1) return s;
                  
                  const item = s.items[itemIndex];
                  const newItem = {
                      ...item,
                      id: crypto.randomUUID(),
                      details: { ...item.details }
                  };
                  
                  const newItems = [...s.items];
                  newItems.splice(itemIndex + 1, 0, newItem);
                  
                  return { ...s, items: newItems };
              }
              return s;
          })
      }));
  };
  
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(quote.sections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setQuote(prev => ({ ...prev, sections: items }));
  };

  const calculateItemTotal = (item: QuoteItem) => {
      return Object.entries(item.details).reduce((acc, [role, days]) => {
          return acc + (days * (availableRates[role] || 0));
      }, 0);
  };
  
  const calculateItemDays = (item: QuoteItem) => {
      return Object.values(item.details).reduce((acc, days) => acc + days, 0);
  }

  const calculateSectionTotal = (section: QuoteSection) => {
      return section.items.reduce((acc, item) => acc + calculateItemTotal(item), 0);
  };
  
  const calculateSectionRoleTotal = (section: QuoteSection, role: string) => {
      return section.items.reduce((acc, item) => acc + (item.details[role] || 0), 0);
  };

  const handleSave = async () => {
    if(!quote.clientId || !quote.projectId) {
        alert("Veuillez sélectionner un client et un projet.");
        return;
    }
    const sanitizedSections = quote.sections.map(section => ({
      ...section,
      title: sanitizeText(section.title),
      items: section.items.map(item => ({
        ...item,
        description: sanitizeText(item.description, 1000)
      }))
    }));
    const toSave = { ...quote, sections: sanitizedSections, updatedAt: new Date().toISOString() };
    setLoading(true);
    try {
      await StorageService.saveQuote(toSave);
      navigate('/quotes');
    } catch (err) {
      console.error("Impossible d'enregistrer le devis", err);
      alert("Impossible d'enregistrer le devis. Vérifiez votre connexion ou les permissions.");
    } finally {
      setLoading(false);
    }
  };

  const duplicateQuote = async (mode: 'version' | 'copy') => {
    setIsDuplicating(true);
    try {
      const allQuotes = await StorageService.getQuotes();
      const now = new Date().toISOString();
      const cloneSections = (sections: QuoteSection[]) => sections.map(section => ({
        ...section,
        id: crypto.randomUUID(),
        items: section.items.map(item => ({ ...item, id: crypto.randomUUID() }))
      }));
      if (mode === 'version') {
        const sameRef = allQuotes.filter(q => q.reference === quote.reference);
        const maxVersion = sameRef.reduce((max, q) => Math.max(max, q.version || 1), quote.version || 1);
            const newQuote: Quote = {
          ...quote,
          id: crypto.randomUUID(),
          status: QuoteStatus.DRAFT,
          createdAt: now,
          updatedAt: now,
          version: maxVersion + 1,
          sections: cloneSections(quote.sections)
        };
        await StorageService.saveQuote(newQuote);
        navigate(`/quotes/edit/${newQuote.id}`);
      } else {
        const newQuote: Quote = {
          ...quote,
          id: crypto.randomUUID(),
          reference: `${quote.reference}-COPY`,
          status: QuoteStatus.DRAFT,
          createdAt: now,
          updatedAt: now,
          version: 1,
          sections: cloneSections(quote.sections)
        };
        await StorageService.saveQuote(newQuote);
        navigate(`/quotes/edit/${newQuote.id}`);
      }
    } catch (err) {
      console.error("Duplication échouée", err);
      alert("La duplication a échoué. Vérifiez vos permissions ou votre connexion.");
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleExportPdf = () => {
      const content = pdfTemplateRef.current;
      if (!content) return;

      const clone = content.cloneNode(true) as HTMLDivElement;
      clone.querySelectorAll('.ref-internal-block').forEach(el => el.remove());

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
          alert("Veuillez autoriser les pop-ups pour imprimer le devis.");
          return;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${quote.reference}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
            <style>
              body { 
                  font-family: 'Inter', sans-serif; 
                  -webkit-print-color-adjust: exact; 
                  print-color-adjust: exact; 
                  background: white; 
              }
              @page { 
                  size: A4; 
                  margin: 0; 
              }
              .print-container {
                width: 210mm;
                min-height: 297mm;
                padding: 15mm;
                margin: 0 auto;
                background: white;
                box-sizing: border-box;
              }
              tr { page-break-inside: avoid; }
              @media print {
                body { background: white; }
                .print-container { width: 100%; padding: 15mm; margin: 0; box-shadow: none; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="print-container">
              ${clone.innerHTML}
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 800);
              }
            </script>
          </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
  };

  const handleExportExcel = () => {
    try {
        const lib = (window as any).XLSX;
        
        if (!lib || !lib.utils) {
            console.error("XLSX library not loaded correctly", lib);
            alert("Erreur: La librairie Excel n'est pas chargée. Vérifiez votre connexion internet.");
            return;
        }

        const wb = lib.utils.book_new();
        const rows: any[][] = [];
        const roleHeaders = allRoles;
        const currencyFormat = '#,##0.00 "€"'; 
        
        // --- MODERN STYLES (NO BORDERS) ---
        const styles = {
            headerDark: {
                fill: { fgColor: { rgb: "1E293B" } }, // Slate-900
                font: { color: { rgb: "FFFFFF" }, bold: true, sz: 11 },
                alignment: { horizontal: "center", vertical: "center" }
            },
            sectionTitle: {
                fill: { fgColor: { rgb: "EEF2FF" } }, // Indigo-50
                font: { color: { rgb: "312E81" }, bold: true, sz: 12 }, // Indigo-900
                alignment: { horizontal: "left", vertical: "center" }
            },
            cellNormal: {
                 font: { sz: 10 },
                 alignment: { vertical: "center" }
            },
            cellNumber: {
                 font: { sz: 10 },
                 alignment: { vertical: "center", horizontal: "center" }
            },
            cellCurrency: {
                 font: { sz: 10 },
                 alignment: { vertical: "center", horizontal: "right" }
            },
            titleMain: {
                font: { sz: 20, bold: true, color: { rgb: "0F172A" } }
            },
            label: {
                font: { sz: 10, bold: true, color: { rgb: "64748B" } }
            },
            value: {
                font: { sz: 11, bold: true, color: { rgb: "0F172A" } }
            },
            totalLabel: {
                 font: { bold: true, sz: 11 },
                 alignment: { horizontal: "right" }
            },
            totalValue: {
                 fill: { fgColor: { rgb: "F8FAFC" } },
                 font: { bold: true, sz: 11 },
                 alignment: { horizontal: "right" }
            }
        };

        // --- 1. Header (Clean & Modern) ---
        const docTitle = 'CHIFFRAGE';
        
        // Row 1: Title only (reference kept internal)
        rows.push([{ v: `${docTitle}`, s: styles.titleMain }]); 
        rows.push(['']); // Spacer

        // Row 3: Client
        rows.push([
            { v: 'CLIENT:', s: styles.label },
            { v: selectedClient?.companyName || '', s: styles.value }
        ]);
        
        // Row 4: Project
        rows.push([
            { v: 'PROJET:', s: styles.label },
            { v: selectedProject?.name || '', s: styles.value }
        ]);

        rows.push(['']);
        rows.push(['']);

        // --- 2. TJM Summary ---
        rows.push([{ v: 'GRILLE TARIFAIRE (TJM)', s: { font: { bold: true, color: { rgb: "94A3B8" } } } }]);
        
        const tjmHeaderRow = ['RÔLE', 'PRIX / JOUR'];
        rows.push(tjmHeaderRow.map(h => ({ v: h, s: styles.headerDark })));
        
        roleHeaders.forEach(role => {
            rows.push([
                { v: role, s: styles.cellNormal },
                { t: 'n', v: availableRates[role] || 0, z: currencyFormat, s: styles.cellCurrency }
            ]);
        });
        rows.push(['']);
        rows.push(['']);

        // --- 3. Detailed Matrix ---
        let currentRowIndex = rows.length; 
        const startRowForSum = currentRowIndex + 1; // Start summing from the first section header or item

        quote.sections.forEach(section => {
            // Section Title
            rows.push([{ v: ` ${section.title.toUpperCase()}`, s: styles.sectionTitle }]);
            currentRowIndex++;

            // Header Row
            const headers = ['DESCRIPTION', ...roleHeaders, 'TOTAL JOURS', 'TOTAL PRIX'];
            rows.push(headers.map(h => ({ v: h, s: styles.headerDark })));
            currentRowIndex++;

            // Items
            section.items.forEach(item => {
                const rowData: any[] = [];
                // Description (Indented)
                rowData.push({ v: '    ' + item.description, s: styles.cellNormal });

                // Role columns (Days)
                roleHeaders.forEach(role => {
                    const days = item.details[role] || 0;
                    rowData.push({ t: 'n', v: days, s: styles.cellNumber }); 
                });

                const excelRow = currentRowIndex + 1; 
                
                // Formula: Total Days = SUM(FirstRoleColumn : LastRoleColumn)
                const firstRoleCol = 'B';
                const lastRoleCol = lib.utils.encode_col(roleHeaders.length); 
                const formulaDays = `SUM(${firstRoleCol}${excelRow}:${lastRoleCol}${excelRow})`;
                rowData.push({ t: 'n', f: formulaDays, s: styles.cellNumber });

                // Formula: Total Price = (Days1 * TJM1) + (Days2 * TJM2) ...
                const priceParts = roleHeaders.map((role, idx) => {
                    const colLetter = lib.utils.encode_col(idx + 1); // B, C, D...
                    const rate = availableRates[role] || 0;
                    return `(${colLetter}${excelRow}*${rate})`;
                });
                const formulaPrice = priceParts.length > 0 ? priceParts.join('+') : '0';
                rowData.push({ t: 'n', f: formulaPrice, z: currencyFormat, s: styles.cellCurrency });

                rows.push(rowData);
                currentRowIndex++;
            });
            
            rows.push(['']); // Spacer
            currentRowIndex++;
        });

        // --- 4. Totals ---
        rows.push(['']);
        currentRowIndex++;
        
        // Column Letter for "Total Price" column
        // A=0, Roles..., TotalDays, TotalPrice
        // Index of Total Price = 1 (Description) + RoleHeaders.length + 1 (TotalDays) = RoleHeaders.length + 2 ?
        // Col Index: 0 (Desc), 1..N (Roles), N+1 (Total Days), N+2 (Total Price)
        const priceColIndex = roleHeaders.length + 2;
        const priceColLetter = lib.utils.encode_col(priceColIndex);
        
        // Sum Range: From start of sections to the row before totals
        const endRowForSum = currentRowIndex; 
        
        const totalHtFormula = `SUM(${priceColLetter}${startRowForSum}:${priceColLetter}${endRowForSum})`;
        
        // Spacer columns to align totals to the right
        const spacerCols = Array(priceColIndex - 1).fill({ v: '', s: {} });
        
        // TOTAL HT
        rows.push([
            ...spacerCols, 
            { v: 'TOTAL HT', s: styles.totalLabel }, 
            { t: 'n', f: totalHtFormula, z: currencyFormat, s: styles.totalValue }
        ]);
        const totalHtRowExcelIndex = currentRowIndex + 1;
        currentRowIndex++;
        
        if (quote.hasVat) {
            // TVA
            const vatFormula = `${priceColLetter}${totalHtRowExcelIndex}*0.2`;
            rows.push([
                ...spacerCols, 
                { v: 'TVA (20%)', s: styles.totalLabel }, 
                { t: 'n', f: vatFormula, z: currencyFormat, s: styles.totalValue }
            ]);
            currentRowIndex++;
            
            // TTC
            const ttcFormula = `${priceColLetter}${totalHtRowExcelIndex}*1.2`;
            rows.push([
                ...spacerCols, 
                { v: 'TOTAL TTC', s: styles.totalLabel }, 
                { t: 'n', f: ttcFormula, z: currencyFormat, s: styles.totalValue }
            ]);
            currentRowIndex++;
        }
        
        // --- 5. Write Sheet ---
        const ws = lib.utils.aoa_to_sheet(rows);

        // Column Widths
        const wscols = [
            { wch: 60 }, // A: Description
            ...roleHeaders.map(() => ({ wch: 12 })), // Roles
            { wch: 15 }, // Total Days
            { wch: 20 }, // Total Price
        ];
        ws['!cols'] = wscols;

        lib.utils.book_append_sheet(wb, ws, "Chiffrage");
        lib.writeFile(wb, `Chiffrage.xlsx`);
    } catch (error) {
        console.error("Excel export failed:", error);
        alert("Une erreur est survenue lors de l'export Excel.");
    }
  };

  // Helper for PDF totals
  const getTotalDaysPerRole = () => {
      const totals: Record<string, number> = {};
      quote.sections.forEach(section => {
          section.items.forEach(item => {
              Object.entries(item.details).forEach(([role, days]) => {
                  totals[role] = (totals[role] || 0) + days;
              });
          });
      });
      return totals;
  };
  
  const totalDaysAll = Object.values(getTotalDaysPerRole()).reduce((acc, d) => acc + d, 0);

  const statusOptions = {
      [QuoteStatus.DRAFT]: 'Brouillon',
      [QuoteStatus.SENT]: 'Envoyé',
      [QuoteStatus.ACCEPTED]: 'Accepté',
      [QuoteStatus.REJECTED]: 'Rejeté',
      [QuoteStatus.PENDING]: 'En attente',
      [QuoteStatus.LATE]: 'En retard'
  }
  const selectableStatuses = Object.values(QuoteStatus).filter(s => s !== QuoteStatus.ESTIMATE);
  
  const selectedClient = clients.find(c => c.id === quote.clientId);
  const selectedProject = projects.find(p => p.id === quote.projectId);

  // Strict Mode / DnD compatibility fix
  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
     setIsReady(true);
  }, []);

  if (!isReady) return null;

  const versionOptions = quote.reference
    ? allQuotes.filter(q => q.reference === quote.reference).sort((a, b) => (b.version || 0) - (a.version || 0))
    : [];

  return (
    <div className="max-w-[95%] mx-auto space-y-8 pb-32">
      {/* Header Controls */}
      <div className="sticky top-[73px] z-20 bg-slate-50/95 backdrop-blur-sm -mx-4 px-4 border-b border-slate-200 py-4">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => navigate('/quotes')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium">
              <ArrowLeft size={20} /> Retour
            </button>
            <div className="flex items-center gap-3 px-3 h-11 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 shadow-sm">
              <div className="flex flex-col leading-tight">
                <span className="text-xs text-slate-500">Réf interne</span>
                <span className="font-semibold text-slate-800">{quote.reference}</span>
              </div>
              <span className="px-2 py-1 text-xs bg-indigo-50 text-indigo-700 rounded-full font-semibold">v{quote.version}</span>
            </div>
            {versionOptions.length > 0 && (
              <select
                className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700"
                value={quote.id}
                onChange={(e) => navigate(`/quotes/edit/${e.target.value}`)}
              >
                {versionOptions.map(v => (
                  <option key={v.id} value={v.id}>{`v${v.version} - ${new Date(v.updatedAt).toLocaleDateString('fr-FR')}`}</option>
                ))}
              </select>
            )}
            <div className="relative">
              <select 
                  value={quote.status}
                  onChange={handleStatusChange}
                  className={`appearance-none pl-4 pr-10 h-11 rounded-lg text-sm font-bold cursor-pointer outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 border-none shadow-sm transition-all
                      ${quote.status === QuoteStatus.ACCEPTED ? 'bg-emerald-100 text-emerald-800' : 
                        quote.status === QuoteStatus.SENT ? 'bg-amber-100 text-amber-800' : 
                        quote.status === QuoteStatus.REJECTED ? 'bg-red-100 text-red-800' : 'bg-white text-slate-700 border border-slate-300'
                      }`}
              >
                  {selectableStatuses.map(s => (
                      <option key={s} value={s}>{statusOptions[s]}</option>
                  ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-current opacity-70">
                   <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-end">
            <div className="relative">
              <button
                onClick={() => setShowExportMenu((v) => !v)}
                className="flex items-center gap-2 h-11 px-4 bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-200 rounded-lg shadow-sm transition-colors font-medium text-sm"
              >
                Export
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg text-sm min-w-[160px] z-30">
                  <button
                    onClick={() => { setShowExportMenu(false); handleExportExcel(); }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <FileSpreadsheet size={16} className="text-emerald-600" /> Excel
                  </button>
                  <button
                    onClick={() => { setShowExportMenu(false); handleExportPdf(); }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <FileText size={16} className="text-indigo-600" /> Export PDF
                  </button>
                </div>
              )}
            </div>
            <button 
                onClick={handleSave}
                className="flex items-center gap-2 h-11 px-5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all active:scale-95 font-medium"
            >
                <Save size={18} /> Enregistrer
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => duplicateQuote('version')}
                disabled={isDuplicating}
                className="flex items-center gap-1 h-11 px-3 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg transition disabled:opacity-60"
              >
                Nouvelle version
              </button>
              <button
                onClick={() => duplicateQuote('copy')}
                disabled={isDuplicating}
                className="flex items-center gap-1 h-11 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition disabled:opacity-60"
              >
                Dupliquer
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md shadow-slate-200/50 border border-slate-200 overflow-hidden">
        <div className="p-8 bg-slate-50/50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
                    <h3 className="text-lg font-bold text-slate-800">Informations Générales</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Nom du chiffrage</label>
                        <input 
                            type="text" 
                            value={quote.title || ''}
                            onChange={e => setQuote({...quote, title: e.target.value})}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-400"
                            placeholder="Ex: Refonte portail client"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="ref-internal-block">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Référence (interne)</label>
                            <input 
                                type="text" 
                                value={quote.reference}
                                onChange={e => setQuote({...quote, reference: e.target.value})}
                                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-400"
                                placeholder="REF-001"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Date</label>
                            <input 
                                type="date" 
                                value={quote.createdAt.split('T')[0]}
                                onChange={e => setQuote({...quote, createdAt: new Date(e.target.value).toISOString()})}
                                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                     <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Client <span className="text-red-500">*</span></label>
                        <select 
                            value={quote.clientId} 
                            onChange={handleClientChange}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                        >
                            <option value="">Sélectionner un client</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                        </select>
                     </div>
                     <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Projet <span className="text-red-500">*</span></label>
                        <select 
                            value={quote.projectId} 
                            onChange={handleProjectChange}
                            disabled={!quote.clientId}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100 disabled:text-slate-400 bg-white"
                        >
                            <option value="">Sélectionner un projet</option>
                            {currentClientProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                     </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                    <input 
                        type="checkbox" 
                        id="vat-toggle"
                        checked={quote.hasVat}
                        onChange={e => setQuote({...quote, hasVat: e.target.checked})}
                        className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="vat-toggle" className="text-sm font-medium text-slate-700 select-none cursor-pointer">
                        Appliquer la TVA (20%)
                    </label>
                </div>
            </div>

             <div className="flex flex-col justify-between items-end text-right border-l border-slate-200 pl-8 border-dashed">
                <div className="w-full">
                     <p className="text-slate-500 text-sm font-medium mb-1">Montant Total {quote.hasVat ? 'HT' : ''}</p>
                     <div className="text-5xl font-extrabold text-slate-900 tracking-tight">{quote.totalAmount.toLocaleString('fr-FR')} €</div>
                     {quote.hasVat && (
                         <p className="text-slate-400 text-sm font-medium mt-1">{(quote.totalAmount * 1.2).toLocaleString('fr-FR')} € TTC</p>
                     )}
                </div>
            </div>
        </div>
      </div>

      {/* MATRIX EDITOR */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="sections">
            {(provided) => (
                <div 
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-8"
                >
                    {quote.sections.map((section, sectionIndex) => (
                         <Draggable key={section.id} draggableId={section.id} index={sectionIndex}>
                            {(provided) => (
                                <div 
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className="bg-white rounded-xl shadow-md shadow-slate-200/50 border border-slate-200 overflow-hidden ring-1 ring-slate-900/5"
                                >
                                    {/* Section Header */}
                                    <div className="bg-slate-50 p-4 flex items-center gap-4 border-b border-slate-200">
                                        <div 
                                            {...provided.dragHandleProps}
                                            className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-200 rounded text-slate-400"
                                        >
                                            <GripVertical size={20} />
                                        </div>

                                        <div className="flex-1">
                                            <input 
                                                className="w-full bg-transparent font-bold text-slate-800 text-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 rounded px-2 py-1 placeholder-slate-400"
                                                value={section.title}
                                                onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                                                placeholder="Nom de la catégorie (ex: Design)"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-sm font-bold text-slate-700 bg-white px-4 py-1.5 rounded-full border border-slate-200 shadow-sm whitespace-nowrap">
                                                {calculateSectionTotal(section).toLocaleString('fr-FR')} €
                                            </div>
                                            <button onClick={() => duplicateSection(section.id)} className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors" title="Dupliquer la catégorie">
                                                <PlusCircle size={20} />
                                            </button>
                                            <button onClick={() => deleteSection(section.id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Supprimer la catégorie">
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Matrix Table */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm border-collapse">
                                            <thead>
                                                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600">
                                                    <th className="px-6 py-4 font-bold uppercase text-xs tracking-wider w-80">Fonctionnalité / Tâche</th>
                                                    {allRoles.map(role => (
                                                        <th key={role} className="px-2 py-4 font-bold text-center border-l border-slate-200 min-w-[100px]">
                                                            <div className="text-[10px] uppercase text-slate-500 mb-0.5">{role}</div>
                                                            <div className="text-xs text-indigo-600 font-extrabold">{availableRates[role]}€</div>
                                                        </th>
                                                    ))}
                                                    <th className="px-6 py-4 font-bold uppercase text-xs tracking-wider text-right border-l border-slate-200 bg-slate-50 whitespace-nowrap min-w-[140px]">Total Ligne</th>
                                                    <th className="w-20 bg-slate-50 text-center font-bold uppercase text-xs text-slate-400">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {section.items.map((item, idx) => (
                                                    <tr key={item.id} className={`group transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} hover:bg-blue-50/50`}>
                                                        <td className="p-3 pl-6">
                                                            <textarea 
                                                                rows={1}
                                                                className="w-full bg-transparent outline-none border-b border-transparent focus:border-indigo-500 placeholder-slate-400 text-slate-700 font-medium resize-none overflow-hidden"
                                                                value={item.description}
                                                                onChange={(e) => {
                                                                    updateItem(section.id, item.id, 'description', e.target.value);
                                                                    e.target.style.height = 'auto';
                                                                    e.target.style.height = e.target.scrollHeight + 'px';
                                                                }}
                                                                placeholder="Description de la tâche..."
                                                                onInput={(e: any) => {
                                                                    e.target.style.height = 'auto';
                                                                    e.target.style.height = e.target.scrollHeight + 'px';
                                                                }}
                                                            />
                                                        </td>
                                                        {allRoles.map(role => (
                                                            <td key={role} className="p-2 text-center border-l border-slate-100 border-dashed">
                                                                <input 
                                                                    type="number" 
                                                                    step="0.1"
                                                                    min="0"
                                                                    className={`w-16 text-center rounded-md py-1.5 outline-none transition-all text-sm
                                                                        ${item.details[role] 
                                                                            ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 shadow-sm' 
                                                                            : 'bg-transparent text-slate-400 hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-500 border border-transparent'
                                                                        }`}
                                                                    value={item.details[role] !== undefined ? item.details[role] : ''}
                                                                    onChange={(e) => updateItemDetail(section.id, item.id, role, Number(e.target.value))}
                                                                    placeholder="0"
                                                                />
                                                            </td>
                                                        ))}
                                                        <td className="px-6 py-3 text-right font-bold text-slate-800 border-l border-slate-100 bg-slate-50/50 whitespace-nowrap">
                                                            {calculateItemTotal(item) > 0 ? calculateItemTotal(item).toLocaleString('fr-FR') + ' €' : '-'}
                                                        </td>
                                                        <td className="pr-4 text-center bg-slate-50/50 whitespace-nowrap">
                                                            <button onClick={() => duplicateItem(section.id, item.id)} className="text-slate-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 mr-1" title="Dupliquer">
                                                                <PlusCircle size={18} />
                                                            </button>
                                                            <button onClick={() => deleteItem(section.id, item.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1" title="Supprimer">
                                                                <X size={18} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {/* Summary Row for Section */}
                                                <tr className="bg-slate-100 border-t-2 border-slate-200">
                                                    <td className="px-6 py-3 text-right text-xs font-bold uppercase text-slate-500 tracking-wider">Total Jours / Rôle</td>
                                                    {allRoles.map(role => (
                                                        <td key={role} className="px-2 py-3 text-center border-l border-slate-200">
                                                            {calculateSectionRoleTotal(section, role) > 0 ? (
                                                                <span className="inline-block px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold text-xs">
                                                                    {calculateSectionRoleTotal(section, role).toFixed(2)}j
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-300 text-xs">-</span>
                                                            )}
                                                        </td>
                                                    ))}
                                                    <td className="px-6 py-3 text-right text-indigo-900 font-extrabold text-lg border-l border-slate-200 bg-indigo-50 whitespace-nowrap">
                                                        {calculateSectionTotal(section).toLocaleString('fr-FR')} €
                                                    </td>
                                                    <td className="bg-indigo-50"></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="p-3 bg-white border-t border-slate-100">
                                        <button onClick={() => addItemToSection(section.id)} className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-lg text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center gap-2 transition-all font-medium text-sm">
                                            <Plus size={16} /> Ajouter une ligne
                                        </button>
                                    </div>
                                </div>
                            )}
                        </Draggable>
                    ))}
                    {provided.placeholder}
                </div>
            )}
        </Droppable>
      </DragDropContext>

        <button onClick={addSection} className="w-full py-10 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:bg-white hover:border-indigo-500 hover:text-indigo-600 transition-all group bg-slate-50">
            <div className="p-3 rounded-full bg-slate-200 group-hover:bg-indigo-100 mb-3 transition-colors">
                <PlusCircle size={32} className="text-slate-400 group-hover:text-indigo-600" />
            </div>
            <span className="font-semibold">Ajouter une nouvelle catégorie</span>
        </button>

       {/* Footer Notes */}
       <div className="mt-8">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 pl-1">Notes & Conditions</label>
            <div className="p-1 bg-white rounded-xl shadow-sm border border-slate-200">
                <textarea
                    rows={4}
                    className="w-full rounded-lg p-4 text-sm text-slate-700 focus:ring-0 border-none outline-none resize-y placeholder-slate-400"
                    placeholder="Conditions de paiement, délais de livraison, validité..."
                    value={quote.notes || ''}
                    onChange={e => setQuote({...quote, notes: e.target.value})}
                />
            </div>
        </div>

        {/* HIDDEN TEMPLATE - Used as data source for the new window */}
        <div 
            ref={pdfTemplateRef}
            id="pdf-content" 
            className="hidden"
        >
            {/* Header */}
            <div className="flex justify-between items-start mb-12 border-b-2 border-slate-900 pb-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 uppercase tracking-tighter">
            {'CHIFFRAGE'}
                    </h1>
                    {quote.reference && (
                      <p className="text-xs font-medium text-slate-400 mt-1">Réf interne: {quote.reference}</p>
                    )}
                    <p className="text-sm font-medium text-slate-500">Date: {new Date(quote.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
            </div>

            {/* Project Title */}
            <div className="mb-8">
                <h3 className="text-xl font-bold text-slate-900 mb-2">{selectedProject?.name}</h3>
                <p className="text-sm text-slate-600 italic">{selectedProject?.description}</p>
            </div>

            {/* Detailed Table */}
            <div className="mb-8">
                <table className="w-full text-left text-sm border-collapse">
                    <thead>
                        <tr className="bg-slate-100 text-slate-900 border-b-2 border-slate-200">
                            <th className="py-3 px-4 font-bold uppercase text-xs w-[45%]">Description</th>
                            <th className="py-3 px-4 font-bold uppercase text-xs w-[25%]">Détail (Jours)</th>
                            <th className="py-3 px-4 font-bold uppercase text-xs text-center w-[10%]">Total Jours</th>
                            <th className="py-3 px-4 font-bold uppercase text-xs text-right w-[20%]">Total HT</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {quote.sections.map(section => (
                            <React.Fragment key={section.id}>
                                {/* Section Title Row */}
                                <tr className="bg-slate-50/50">
                                    <td colSpan={4} className="py-3 px-4 font-bold text-slate-800 border-b border-slate-200 pt-6">
                                        {section.title}
                                    </td>
                                </tr>
                                {section.items.map(item => (
                                    <tr key={item.id}>
                                        <td className="py-3 px-4 text-slate-700 align-top">
                                            {item.description}
                                        </td>
                                        <td className="py-3 px-4 align-top">
                                            <div className="flex flex-col gap-1">
                                                {Object.entries(item.details).map(([r, d]) => (
                                                    <div key={r} className="flex justify-between items-center text-[11px] border-b border-slate-100 last:border-0 pb-1 last:pb-0">
                                                        <span className="text-slate-500 font-medium mr-2">{r}</span>
                                                        <span className="font-bold text-slate-800">{d}j</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 font-medium text-center align-top whitespace-nowrap">
                                            {calculateItemDays(item).toFixed(1)}j
                                        </td>
                                        <td className="py-3 px-4 font-bold text-right align-top whitespace-nowrap">
                                            {calculateItemTotal(item).toLocaleString('fr-FR')} €
                                        </td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals Section */}
            <div className="flex justify-end mb-12">
                 <div className="w-1/2">
                    <div className="flex justify-between py-2 border-b border-slate-200">
                        <span className="font-bold text-slate-500 text-sm">Total Jours H/M</span>
                        <span className="font-bold text-slate-900">{totalDaysAll.toFixed(1)} jours</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-200 mt-2">
                        <span className="font-bold text-slate-500 text-sm">Total HT</span>
                        <span className="font-bold text-slate-900 text-lg">{quote.totalAmount.toLocaleString('fr-FR')} €</span>
                    </div>
                    {quote.hasVat && (
                        <div className="flex justify-between py-2 border-b border-slate-200 text-slate-500">
                            <span className="text-sm">TVA (20%)</span>
                            <span>{(quote.totalAmount * 0.2).toLocaleString('fr-FR')} €</span>
                        </div>
                    )}
                    <div className="flex justify-between py-4 border-b-2 border-slate-900 mt-2">
                        <span className="font-extrabold text-slate-900 text-lg">TOTAL {quote.hasVat ? 'TTC' : 'HT'}</span>
                        <span className="font-extrabold text-indigo-600 text-2xl">{(quote.totalAmount * (quote.hasVat ? 1.2 : 1)).toLocaleString('fr-FR')} €</span>
                    </div>
                 </div>
            </div>

            {/* Footer / Notes - Only show if notes exist */}
            {quote.notes && (
                <div className="border-t border-slate-200 pt-6">
                    <h4 className="font-bold text-slate-800 text-xs uppercase mb-2">Conditions & Notes</h4>
                    <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">
                        {quote.notes}
                    </p>
                </div>
            )}
            
            <div className="mt-12 text-center text-xs text-slate-400">
                <p>Merci de votre confiance.</p>
                <p className="mt-1">Document généré par DevisPro Manager</p>
            </div>
        </div>

    </div>
  );
};

export default QuoteEditor;
