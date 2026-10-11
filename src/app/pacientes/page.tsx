import Link from "next/link";
import { Search, UserPlus } from "lucide-react";
import { createPatient } from "@/lib/actions";
import { db } from "@/lib/db";
import { dateMx } from "@/lib/utils";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const patients = await db.patient.findMany({
    where: q
      ? {
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { phone: { contains: q } },
            { email: { contains: q } },
          ],
        }
      : undefined,
    include: {
      _count: { select: { appointments: true, treatments: true } },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="eyebrow">Expedientes</div>
          <h1 className="title">Pacientes</h1>
          <p className="subtitle">{patients.length} pacientes encontrados</p>
        </div>
        <a className="btn primary" href="#nuevo-paciente">
          <UserPlus size={16} />
          Nuevo paciente
        </a>
      </div>

      <div className="card">
        <form className="row search patient-search">
          <Search size={17} />
          <input
            className="input"
            name="q"
            placeholder="Nombre, teléfono o correo…"
            defaultValue={q}
          />
          <button className="btn">Buscar</button>
        </form>
        <div className="tablewrap">
          <table className="table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Contacto</th>
                <th>Tipo</th>
                <th>Actividad</th>
                <th>Citas</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <tr key={patient.id}>
                  <td>
                    <div className="row">
                      <span className="avatar">
                        {patient.firstName[0]}
                        {patient.lastName[0]}
                      </span>
                      <div>
                        <b>
                          {patient.firstName} {patient.lastName}
                        </b>
                        <div className="small">
                          Desde {dateMx(patient.createdAt)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {patient.phone}
                    <div className="small">{patient.email}</div>
                  </td>
                  <td>
                    <span className="badge">
                      {patient.type === "DENTAL" ? "Dental" : "Médico"}
                    </span>
                  </td>
                  <td>{patient._count.treatments} tratamientos</td>
                  <td>{patient._count.appointments}</td>
                  <td>
                    <Link
                      className="btn ghost"
                      href={"/pacientes/" + patient.id}
                    >
                      Ver ficha →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <section className="card section-gap" id="nuevo-paciente">
        <div className="row">
          <UserPlus size={19} />
          <h2>Alta de paciente</h2>
        </div>
        <form action={createPatient} className="formgrid">
          <Field label="Nombre">
            <input className="input" name="firstName" required />
          </Field>
          <Field label="Apellidos">
            <input className="input" name="lastName" required />
          </Field>
          <Field label="Teléfono">
            <input className="input" name="phone" required />
          </Field>
          <Field label="Correo">
            <input className="input" name="email" type="email" />
          </Field>
          <Field label="Fecha de nacimiento">
            <input className="input" name="birthDate" type="date" required />
          </Field>
          <Field label="Sexo">
            <select className="input" name="gender">
              <option>Femenino</option>
              <option>Masculino</option>
              <option>No especificado</option>
            </select>
          </Field>
          <Field label="Tipo de expediente">
            <select className="input" name="type">
              <option value="DENTAL">Dental</option>
              <option value="MEDICO">Médico</option>
            </select>
          </Field>
          <Field label="Alergias">
            <input className="input" name="allergies" />
          </Field>
          <div className="field span-all">
            <label>Antecedentes y condiciones</label>
            <textarea className="input" name="conditions" rows={3} />
          </div>
          <button className="btn primary span-all">
            Crear expediente
          </button>
        </form>
      </section>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}
