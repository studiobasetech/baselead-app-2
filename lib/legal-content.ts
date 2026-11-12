/* Legal texts provided by Studio Base LLC (Nov 2026). English and Spanish. */

export type LegalSection = { title: string; paras: string[] };
export type LegalDocText = { title: string; effective: string; sections: LegalSection[] };

export const LEGAL_TEXTS: Record<"privacy" | "terms", Record<"en" | "es", LegalDocText>> = {
  "privacy": {
    "en": {
      "title": "Privacy Policy",
      "effective": "Effective date: Nov. 2026",
      "sections": [
        {
          "title": "1. Scope and identity",
          "paras": [
            "This notice describes how Studio Base, LLC handles personal information in connection with BaseLead, a business-oriented lead discovery, CRM, AI-assisted outreach, pipeline, reporting, sales resources and integrations platform. It covers account users, business contacts and prospect information where Studio Base determines processing purposes. When processing Customer Data solely on a business customer's instructions, the customer generally determines the purposes and Studio Base acts as its service provider or processor."
          ]
        },
        {
          "title": "2. Categories and sources",
          "paras": [
            "Depending on activated features, information may include names, business contact information, job titles, employer, account credentials, device identifiers, IP addresses, activity logs, CRM notes, lead records, message contents, communications metadata, documents, AI prompts and outputs, performance metrics and integration tokens. Sources may include users, customers, authorized integrations, publicly accessible business information and licensed data suppliers. Public accessibility does not itself authorize every downstream use."
          ]
        },
        {
          "title": "3. Purposes",
          "paras": [
            "We use information to create accounts; provide lead discovery, search, qualification, CRM and pipeline management; prepare outreach drafts and, where enabled, transmit communications; deliver reporting and collaboration; provide support; maintain security; detect abuse; and meet legal obligations. Optional analytics, advertising, model-training or other secondary purposes require separate review and notices or permissions where legally required."
          ]
        },
        {
          "title": "4. AI processing and lead accuracy",
          "paras": [
            "AI outputs may be incorrect or outdated. Human review is required before consequential reliance or outreach. We do not claim that a lead has consented to marketing merely because their contact information appears in BaseLead."
          ]
        },
        {
          "title": "5. Legal bases and marketing",
          "paras": [
            "Where law requires a lawful basis, processing will rely on an applicable basis, such as contract, legal obligation, legitimate interests where permitted, or consent when required. Customers remain responsible for lawful prospect sourcing and outreach. U.S. commercial email must comply with CAN-SPAM; Mexico-directed marketing and data processing require separate review under applicable Mexican law."
          ]
        },
        {
          "title": "6. Disclosure and international transfers",
          "paras": [
            "We may disclose data to contracted infrastructure, AI, email, security, analytics and support providers, authorized integrations, professional advisers and authorities when required. A verified subprocessor list and international transfer locations must be maintained: Third-party service providers are selected based on operational requirements and are subject to applicable data protection and security obligations. The Company will maintain and update its internal records of such providers as necessary. Cross-border transfers are subject to applicable notice, contractual and other safeguards."
          ]
        },
        {
          "title": "7. Security and retention",
          "paras": [
            "We use risk-appropriate organizational and technical safeguards, including access controls and secure credential management, subject to implementation verification. No system is risk-free. Data is retained according to documented purposes, customer instructions, legal holds and the Data Retention & Deletion Policy. Actual periods: up to three years."
          ]
        },
        {
          "title": "8. Rights and requests",
          "paras": [
            "Depending on applicable law and Studio Base's role, individuals may request access, correction, deletion, portability, objection or opt-out and, where applicable, appeal a denied request. Submit requests to info@studiobase.tech We may verify identity and refer customer-controlled records to the relevant customer. Applicable statutory deadlines and exemptions control."
          ]
        },
        {
          "title": "9. Children, updates and contact",
          "paras": [
            "BaseLead is intended for adults in a professional context, not children. Material changes will be notified as legally required. Contact: Studio Base, LLC; 5900 Balcones Drive, #34618 Austin, TX 78731 United States info@studiobase.tech"
          ]
        },
        {
          "title": "10. Google user data",
          "paras": [
            "If you connect a Google account, BaseLead requests only the permissions needed for the features you use, such as sending emails you write or approve from your Gmail, and checking your Google Calendar so leads can book meetings. Google connection tokens are stored encrypted, and you can disconnect Google at any time in Integrations or in your Google account settings.",
            "BaseLead's use and transfer to any other app of information received from Google APIs will adhere to the Google API Services User Data Policy (https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements."
          ]
        }
      ]
    },
    "es": {
      "title": "Aviso de Privacidad",
      "effective": "Vigencia: Noviembre 2026",
      "sections": [
        {
          "title": "1. Alcance e identidad",
          "paras": [
            "Este aviso describe el tratamiento de datos personales por Studio Base, LLC en relación con BaseLead, plataforma empresarial de búsqueda de prospectos, CRM, asistencia de IA para comunicaciones, seguimiento de oportunidades, reportes, recursos comerciales e integraciones. Comprende usuarios, contactos empresariales y prospectos cuando Studio Base determina las finalidades. Cuando trata datos por instrucciones de un cliente empresarial, este generalmente determina las finalidades y Studio Base actúa como encargado o prestador de servicios."
          ]
        },
        {
          "title": "2. Categorías y fuentes",
          "paras": [
            "Según las funciones activadas, se podrán tratar nombres, datos profesionales de contacto, puesto, empresa, credenciales, identificadores de dispositivos, direcciones IP, registros de uso, notas de CRM, datos de prospectos, mensajes, metadatos de comunicaciones, documentos, instrucciones y resultados de IA, métricas e identificadores de integraciones. Las fuentes incluyen usuarios, clientes, integraciones autorizadas, fuentes públicas empresariales y proveedores autorizados. Que un dato sea público no autoriza cualquier tratamiento posterior."
          ]
        },
        {
          "title": "3. Finalidades",
          "paras": [
            "Los datos se utilizan para administrar cuentas; operar búsquedas, calificación de prospectos, CRM y oportunidades; elaborar borradores y, cuando esté habilitado, enviar comunicaciones; generar reportes; brindar soporte; proteger sistemas; prevenir abusos y cumplir obligaciones legales. Analítica opcional, publicidad, entrenamiento de modelos u otras finalidades secundarias requieren revisión y, cuando corresponda, aviso o consentimiento separado."
          ]
        },
        {
          "title": "4. Inteligencia artificial y exactitud",
          "paras": [
            "Los resultados de IA pueden contener errores o información desactualizada. Se requiere revisión humana antes de decisiones relevantes o campañas. La plataforma podrá utilizar herramientas y servicios de inteligencia artificial proporcionados por terceros para facilitar la identificación, búsqueda y análisis de prospectos comerciales. El tratamiento de datos personales mediante dichas herramientas estará sujeto a las finalidades establecidas en el presente aviso de privacidad y a las disposiciones legales aplicables. Los resultados generados mediante inteligencia artificial podrán contener errores o información desactualizada, por lo que deberán ser verificados antes de utilizarse para decisiones comerciales relevantes. Cualquier uso de datos para entrenamiento de modelos o decisiones exclusivamente automatizadas deberá evaluarse previamente conforme a la normativa aplicable. La inclusión de un contacto no acredita consentimiento para recibir publicidad."
          ]
        },
        {
          "title": "5. Bases de tratamiento y mercadotecnia",
          "paras": [
            "Cuando la ley lo exija, el tratamiento se apoyará en una base jurídica válida, como contrato, obligación legal, interés legítimo donde proceda o consentimiento. Los clientes son responsables de la licitud de sus bases de prospectos y campañas. Los correos comerciales en EE. UU. deben cumplir CAN-SPAM; los tratamientos y comunicaciones dirigidos a México requieren análisis de la normativa mexicana aplicable."
          ]
        },
        {
          "title": "6. Transferencias y proveedores",
          "paras": [
            "Podremos comunicar datos a proveedores contratados de infraestructura, IA, correo, seguridad, analítica y soporte; integraciones autorizadas; asesores y autoridades competentes. Se deberá mantener una lista verificada de sub encargados y ubicaciones: Los proveedores de servicios tecnológicos incluyendo alojamiento de datos, inteligencia artificial, correo electrónico y analítica, serán identificados y evaluados conforme a las necesidades operativas de la plataforma, Base Lead mantendrá un registro interno actualizado de dichos proveedores, considerando sus prácticas de seguridad, tratamiento de datos personales y cumplimiento de las disposiciones legales aplicables. Las transferencias internacionales estarán sujetas a los avisos, contratos y salvaguardas aplicables."
          ]
        },
        {
          "title": "7. Seguridad y conservación",
          "paras": [
            "Se aplicarán medidas técnicas y organizativas proporcionales al riesgo, sujetas a confirmación de implementación. Ningún sistema es completamente seguro. Los datos se conservarán conforme a finalidades documentadas, instrucciones del cliente, obligaciones legales y la Política de Conservación y Eliminación. Plazos reales: 3 años"
          ]
        },
        {
          "title": "8. Derechos y solicitudes",
          "paras": [
            "Conforme a la ley aplicable y al papel de Studio Base, las personas podrán solicitar acceso, rectificación, cancelación, oposición (ARCO), eliminación, portabilidad u otros derechos y presentar recursos cuando proceda. Contacto: info@studiobase.tech Podremos verificar identidad y canalizar solicitudes relativas a datos controlados por clientes."
          ]
        },
        {
          "title": "9. Menores, modificaciones y contacto",
          "paras": [
            "BaseLead se dirige a adultos para fines profesionales, no a menores. Los cambios materiales se notificarán cuando lo exija la ley. Contacto: Studio Base, LLC; 5900 Balcones Drive, #34618 Austin, TX 78731 United States: info@studiobase.tech"
          ]
        },
        {
          "title": "10. Datos de usuario de Google",
          "paras": [
            "Si conectas una cuenta de Google, BaseLead solicita solo los permisos necesarios para las funciones que utilizas, como enviar desde tu Gmail los correos que escribes o apruebas y consultar tu Google Calendar para que los prospectos agenden reuniones. Los tokens de conexión de Google se guardan cifrados y puedes desconectar Google en cualquier momento desde Integraciones o desde la configuración de tu cuenta de Google.",
            "El uso y la transferencia a cualquier otra aplicación de la información recibida de las API de Google por parte de BaseLead se ajustarán a la Política de Datos de Usuario de los Servicios de API de Google (https://developers.google.com/terms/api-services-user-data-policy), incluidos los requisitos de Uso Limitado."
          ]
        }
      ]
    }
  },
  "terms": {
    "en": {
      "title": "Terms and Conditions",
      "effective": "Effective date: November, 2026",
      "sections": [
        {
          "title": "1. Agreement and eligibility",
          "paras": [
            "These Terms govern access to BaseLead by a business customer and its authorized users. By accepting electronically, the user represents that they are at least 18 and authorized to bind the customer where applicable."
          ]
        },
        {
          "title": "2. Services and account administration",
          "paras": [
            "BaseLead may provide AI lead discovery, opportunity radar, CRM, pipeline, outreach, sales toolkit, reports, team performance and integrations. Features and limits are determined by the order form or plan. Customers must secure credentials, administer user permissions and report unauthorized access."
          ]
        },
        {
          "title": "3. License and restrictions",
          "paras": [
            "Studio Base grants a limited, nonexclusive, nontransferable right to use the subscribed service for internal lawful business purposes. Customers may not reverse engineer except where law permits, circumvent security, resell access without permission, scrape beyond permitted functionality, transmit malware, violate intellectual property or privacy rights, or use BaseLead for fraud or unlawful spam."
          ]
        },
        {
          "title": "4. Lead sourcing and outreach",
          "paras": [
            "Customer is responsible for lawfully obtaining and using prospect data, providing required notices, honoring opt-outs and ensuring sender identity, postal address, truthful subjects and other applicable CAN-SPAM requirements. The existence of a prospect record does not establish marketing consent. Studio Base may suspend abusive campaigns; this does not eliminate its own statutory responsibilities."
          ]
        },
        {
          "title": "5. AI and output review",
          "paras": [
            "AI-generated leads, scoring, outreach text and business insights are probabilistic and may be inaccurate, biased or nonexclusive. Customers must verify factual claims and compliance before sending or relying on outputs. No guarantee is made of sales, conversions, response rates or revenue."
          ]
        },
        {
          "title": "6. Customer data and intellectual property",
          "paras": [
            "Customer retains rights in its lawfully provided content. Customer grants Studio Base a limited license to process it to provide and secure the service, subject to the DPA. Studio Base retains its software, designs, trademarks, documentation and technology. Rights in AI outputs depend on applicable law and third-party rights."
          ]
        },
        {
          "title": "7. Third parties and confidentiality",
          "paras": [
            "Third-party integrations are governed by their own terms. Each party must protect the other's nonpublic confidential information with reasonable care and disclose it only to authorized recipients or as legally required. Applicable DPA and security schedules govern customer personal data."
          ]
        },
        {
          "title": "8. Fees and cancellation",
          "paras": [
            "Fees, taxes, payment dates, trial terms, automatic renewals, cancellation, refunds and price changes are governed by the disclosed order form and checkout terms. No undisclosed automatic renewal is created by this document."
          ]
        },
        {
          "title": "9. Warranties and liability",
          "paras": [
            "To the extent permitted by law, the service is provided as available without guarantees of uninterrupted operation or commercial results. Except for excluded liabilities, aggregate contractual liability is capped at fees paid or payable in the 12 months preceding the claim. The cap does not apply to fraud, willful misconduct, unpaid fees or liability that cannot legally be limited."
          ]
        },
        {
          "title": "10. Indemnity and termination",
          "paras": [
            "Customer will defend and indemnify Studio Base against third-party claims resulting from its unlawful outreach, unauthorized data, infringement or material breach, to the extent caused by Customer. Notice, defense control and settlement approval apply. Material breach, nonpayment or security threats may justify proportionate suspension or termination; export and deletion follow the DPA and agreed schedule."
          ]
        },
        {
          "title": "11. Texas law and contact",
          "paras": [
            "Texas law governs to the extent legally permitted, without displacing mandatory protections. Courts in Texas have jurisdiction subject to mandatory law and any signed dispute agreement. Contact: info@studiobase.tech"
          ]
        }
      ]
    },
    "es": {
      "title": "Términos y Condiciones",
      "effective": "Vigencia: Noviembre, 2026",
      "sections": [
        {
          "title": "1. Acuerdo y elegibilidad",
          "paras": [
            "Estos Términos regulan el acceso a BaseLead por clientes empresariales y usuarios autorizados. La aceptación electrónica implica que el usuario es mayor de 18 años y, cuando corresponda, cuenta con facultades para obligar al cliente."
          ]
        },
        {
          "title": "2. Servicios y cuentas",
          "paras": [
            "BaseLead podrá ofrecer descubrimiento de prospectos con IA, radar de oportunidades, CRM, pipeline, outreach, herramientas comerciales, reportes, desempeño de equipos e integraciones. El plan u orden de servicio determina las funciones y límites. El cliente debe proteger credenciales, gestionar permisos y reportar accesos no autorizados."
          ]
        },
        {
          "title": "3. Licencia y restricciones",
          "paras": [
            "Studio Base concede un derecho limitado, no exclusivo e intransferible de uso interno empresarial lícito durante la vigencia contratada. Se prohíbe realizar ingeniería inversa salvo autorización legal, eludir seguridad, revender accesos sin permiso, extraer datos fuera de las funciones autorizadas, transmitir malware, vulnerar derechos o usar la plataforma para fraude o spam ilegal."
          ]
        },
        {
          "title": "4. Prospectos y comunicaciones",
          "paras": [
            "El cliente es responsable de obtener y usar lícitamente datos de prospectos, informar cuando corresponda, respetar bajas y cumplir requisitos de identificación del remitente, domicilio postal, asuntos veraces y demás exigencias de CAN-SPAM y otras leyes aplicables. La presencia de un contacto no equivale a consentimiento. Studio Base podrá suspender campañas abusivas sin excluir sus propias obligaciones legales."
          ]
        },
        {
          "title": "5. IA y revisión",
          "paras": [
            "Los prospectos, puntuaciones, textos y análisis generados con IA pueden ser inexactos, sesgados o no exclusivos. El cliente debe revisar hechos y cumplimiento antes de enviar comunicaciones o tomar decisiones. No se garantizan ventas, conversiones, respuestas ni ingresos."
          ]
        },
        {
          "title": "6. Datos y propiedad intelectual",
          "paras": [
            "El cliente conserva derechos sobre contenido aportado lícitamente y concede a Studio Base autorización limitada para tratarlo a fin de prestar y proteger el servicio conforme al DPA. Studio Base conserva derechos sobre software, diseños, marcas, documentación y tecnología. La titularidad de resultados de IA depende de la ley y derechos de terceros."
          ]
        },
        {
          "title": "7. Terceros y confidencialidad",
          "paras": [
            "Las integraciones de terceros se sujetan a sus condiciones. Cada parte protegerá la información confidencial de la otra con diligencia razonable y solo la divulgará a personas autorizadas o por obligación legal. El DPA y anexos de seguridad rigen los datos personales de clientes."
          ]
        },
        {
          "title": "8. Precios y cancelación",
          "paras": [
            "Precios, impuestos, pagos, pruebas, renovaciones automáticas, cancelaciones, reembolsos y modificaciones se sujetan a la orden y condiciones de contratación informadas. Este documento no crea renovaciones automáticas no informadas."
          ]
        },
        {
          "title": "9. Garantías y responsabilidad",
          "paras": [
            "En la medida permitida por la ley, el servicio se ofrece según disponibilidad, sin garantía de continuidad ni resultados comerciales. Salvo responsabilidades excluidas, el límite agregado contractual será el importe pagado o pagadero en los 12 meses anteriores a la reclamación. No cubre fraude, dolo, pagos adeudados ni responsabilidades legalmente irrenunciables."
          ]
        },
        {
          "title": "10. Indemnización y terminación",
          "paras": [
            "El cliente defenderá e indemnizará a Studio Base frente a reclamaciones de terceros causadas por comunicaciones ilegales, datos no autorizados, infracción o incumplimiento sustancial imputables al cliente, con reglas de aviso, defensa y aprobación de acuerdos. Incumplimientos graves, impagos o riesgos de seguridad podrán justificar suspensión o terminación proporcional; la devolución y eliminación se sujetan al DPA."
          ]
        },
        {
          "title": "11. Ley y contacto",
          "paras": [
            "Rige la ley de Texas en lo permitido, sin excluir protecciones imperativas. Serán competentes los tribunales de texas, sin perjuicio de normas obligatorias o pacto válido de controversias. Contacto: info@studiobase.tech"
          ]
        }
      ]
    }
  }
};
