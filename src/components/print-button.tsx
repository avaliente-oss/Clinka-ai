"use client";

import { Printer } from "lucide-react";

export function PrintButton() { return <button className="btn primary print-button" onClick={() => window.print()} type="button"><Printer size={16} /> Imprimir / Guardar PDF</button>; }
