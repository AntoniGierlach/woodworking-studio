import { connection } from "next/server";
import { getCarpentryServices } from "@/lib/content-data";

export default async function HomeServices() {
  await connection();
  const serviceResult = await getCarpentryServices();

  if (serviceResult.status === "unavailable") {
    return (
      <p className="service-list-notice" role="status">
        Usługi stolarskie są chwilowo niedostępne. Spróbuj ponownie później.
      </p>
    );
  }

  if (serviceResult.services.length === 0) {
    return (
      <p className="service-list-notice" role="status">
        Lista usług stolarskich jest w przygotowaniu.
      </p>
    );
  }

  return (
    <div className="service-list">
      {serviceResult.services.map((service, index) => (
        <article className="service-item" key={service.id}>
          <span className="service-number">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div>
            <h3>{service.title}</h3>
            <p>{service.description}</p>
          </div>
        </article>
      ))}
    </div>
  );
}