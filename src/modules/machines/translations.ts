import { TranslationMap } from "../../utils/i18n-helper"

export const machineTranslations: TranslationMap = {
  // Status translations
  "machine.status.active": {
    en: "Active",
    nl: "Actief", // Dutch
    fr: "Actif", // French
    de: "Aktiv", // German
  },
  "machine.status.inactive": {
    en: "Inactive",
    nl: "Inactief",
    fr: "Inactif",
    de: "Inaktiv",
  },
  "machine.status.maintenance": {
    en: "Maintenance",
    nl: "Onderhoud",
    fr: "Maintenance",
    de: "Wartung",
  },
  "machine.status.sold": {
    en: "Sold",
    nl: "Verkocht",
    fr: "Vendu",
    de: "Verkauft",
  },

  // Field labels
  "machine.field.model": {
    en: "Model",
    nl: "Model",
    fr: "Modèle",
    de: "Modell",
  },
  "machine.field.serial_number": {
    en: "Serial Number",
    nl: "Serienummer",
    fr: "Numéro de série",
    de: "Seriennummer",
  },
  "machine.field.year": {
    en: "Year",
    nl: "Jaar",
    fr: "Année",
    de: "Jahr",
  },
  "machine.field.engine_hours": {
    en: "Engine Hours",
    nl: "Motoruren",
    fr: "Heures moteur",
    de: "Motorstunden",
  },
  "machine.field.fuel_type": {
    en: "Fuel Type",
    nl: "Brandstoftype",
    fr: "Type de carburant",
    de: "Kraftstoffart",
  },
  "machine.field.horsepower": {
    en: "Horsepower",
    nl: "Paardenkracht",
    fr: "Puissance",
    de: "Pferdestärke",
  },
  "machine.field.weight": {
    en: "Weight",
    nl: "Gewicht",
    fr: "Poids",
    de: "Gewicht",
  },
  "machine.field.location": {
    en: "Location",
    nl: "Locatie",
    fr: "Emplacement",
    de: "Standort",
  },
  "machine.field.purchase_date": {
    en: "Purchase Date",
    nl: "Aankoopdatum",
    fr: "Date d'achat",
    de: "Kaufdatum",
  },
  "machine.field.purchase_price": {
    en: "Purchase Price",
    nl: "Aankoopprijs",
    fr: "Prix d'achat",
    de: "Kaufpreis",
  },
  "machine.field.current_value": {
    en: "Current Value",
    nl: "Huidige waarde",
    fr: "Valeur actuelle",
    de: "Aktueller Wert",
  },

  // Actions
  "machine.action.create": {
    en: "Create Machine",
    nl: "Machine aanmaken",
    fr: "Créer une machine",
    de: "Maschine erstellen",
  },
  "machine.action.edit": {
    en: "Edit Machine",
    nl: "Machine bewerken",
    fr: "Modifier la machine",
    de: "Maschine bearbeiten",
  },
  "machine.action.delete": {
    en: "Delete Machine",
    nl: "Machine verwijderen",
    fr: "Supprimer la machine",
    de: "Maschine löschen",
  },
  "machine.action.assign_customer": {
    en: "Assign to Customer",
    nl: "Toewijzen aan klant",
    fr: "Assigner au client",
    de: "Kunden zuweisen",
  },

  // Messages
  "machine.message.created": {
    en: "Machine created successfully",
    nl: "Machine succesvol aangemaakt",
    fr: "Machine créée avec succès",
    de: "Maschine erfolgreich erstellt",
  },
  "machine.message.updated": {
    en: "Machine updated successfully",
    nl: "Machine succesvol bijgewerkt",
    fr: "Machine mise à jour avec succès",
    de: "Maschine erfolgreich aktualisiert",
  },
  "machine.message.deleted": {
    en: "Machine deleted successfully",
    nl: "Machine succesvol verwijderd",
    fr: "Machine supprimée avec succès",
    de: "Maschine erfolgreich gelöscht",
  },

  // Validation messages
  "machine.validation.model_required": {
    en: "Machine model is required",
    nl: "Machine model is verplicht",
    fr: "Le modèle de machine est requis",
    de: "Maschinenmodell ist erforderlich",
  },
  "machine.validation.serial_required": {
    en: "Serial number is required",
    nl: "Serienummer is verplicht",
    fr: "Le numéro de série est requis",
    de: "Seriennummer ist erforderlich",
  },
  "machine.validation.invalid_year": {
    en: "Invalid year",
    nl: "Ongeldig jaar",
    fr: "Année invalide",
    de: "Ungültiges Jahr",
  },
} 