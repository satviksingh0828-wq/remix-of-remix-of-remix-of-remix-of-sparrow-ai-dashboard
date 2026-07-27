import { Truck, User, Building2, MapPin } from "lucide-react";
import type { MasterConfig } from "./MasterList";

export const VEHICLE_CONFIG: MasterConfig = {
  table: "vehicles",
  entityLabel: "Vehicles",
  singular: "vehicle",
  icon: Truck,
  hasDepartment: true,
  titleKey: "registration_number",
  subtitleKeys: ["manufacturer", "model", "department_name"],
  emptyMsg: "Registered vehicles in your fleet, linked to a controlling department.",
  sections: [
    {
      title: "Identification",
      fields: [
        { key: "registration_number", label: "Vehicle Number (Registration Number)", required: true },
        { key: "internal_code", label: "Internal Vehicle Code" },
        { key: "nickname", label: "Vehicle Name / Nickname", full: true },
      ],
    },
    {
      title: "Specifications",
      fields: [
        { key: "manufacturer", label: "Manufacturer" },
        { key: "model", label: "Model" },
        { key: "year_of_manufacture", label: "Year of Manufacture", type: "number" },
        {
          key: "fuel_type",
          label: "Fuel Type",
          options: ["Diesel", "Petrol", "CNG", "LNG", "Electric"],
        },
        { key: "payload_capacity_kg", label: "Payload Capacity (kg)", type: "number" },
      ],
    },
    {
      title: "Purchase",
      fields: [
        { key: "purchase_date", label: "Purchase Date", type: "date" },
        { key: "purchase_cost", label: "Purchase Cost", type: "number" },
      ],
    },
  ],
};

export const DRIVER_CONFIG: MasterConfig = {
  table: "drivers",
  entityLabel: "Drivers",
  singular: "driver",
  icon: User,
  hasDepartment: true,
  titleKey: "full_name",
  subtitleKeys: ["driver_code", "mobile_number", "department_name"],
  emptyMsg: "Driving staff with licence, contact and payroll details.",
  sections: [
    {
      title: "Personal details",
      fields: [
        { key: "driver_code", label: "Driver Code", required: true },
        { key: "full_name", label: "Full Name", required: true },
        { key: "guardian_name", label: "Father's / Guardian's Name" },
        { key: "date_of_birth", label: "Date of Birth", type: "date" },
        { key: "gender", label: "Gender", options: ["Male", "Female", "Other"] },
        {
          key: "marital_status",
          label: "Marital Status",
          options: ["Single", "Married", "Divorced", "Widowed"],
        },
        {
          key: "blood_group",
          label: "Blood Group",
          options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
        },
      ],
    },
    {
      title: "Contact",
      fields: [
        { key: "mobile_number", label: "Mobile Number", required: true },
        { key: "alternate_mobile", label: "Alternate Mobile" },
        { key: "email", label: "Email", type: "email" },
        { key: "emergency_contact_name", label: "Emergency Contact Name" },
        { key: "emergency_contact_number", label: "Emergency Contact Number" },
        { key: "emergency_contact_relationship", label: "Emergency Contact Relationship" },
      ],
    },
    {
      title: "Permanent address",
      fields: [
        { key: "perm_address_line1", label: "Address Line 1", full: true },
        { key: "perm_address_line2", label: "Address Line 2", full: true },
        { key: "perm_city", label: "City" },
        { key: "perm_state", label: "State" },
        { key: "perm_country", label: "Country" },
        { key: "perm_pin_code", label: "PIN Code" },
      ],
    },
    {
      title: "Current address",
      fields: [
        { key: "curr_same_as_perm", label: "Same as Permanent", options: ["Yes", "No"] },
        { key: "curr_address_line1", label: "Address Line 1", full: true },
        { key: "curr_address_line2", label: "Address Line 2", full: true },
        { key: "curr_city", label: "City" },
        { key: "curr_state", label: "State" },
        { key: "curr_country", label: "Country" },
        { key: "curr_pin_code", label: "PIN Code" },
      ],
    },
    {
      title: "Driving licence",
      fields: [
        { key: "licence_number", label: "Driving Licence Number", required: true },
        { key: "licence_type", label: "Licence Type (LMV, HMV, etc.)" },
        { key: "licence_authority", label: "Issuing Authority (RTO)" },
        { key: "licence_issue_date", label: "Issue Date", type: "date" },
        { key: "licence_expiry_date", label: "Expiry Date", type: "date" },
      ],
    },
    {
      title: "Salary",
      fields: [
        {
          key: "salary_type",
          label: "Salary Type",
          options: ["Monthly", "Per Trip", "Per KM", "Daily"],
        },
        { key: "salary_amount", label: "Salary / Wage Amount", type: "number" },
      ],
    },
    {
      title: "Bank details",
      fields: [
        { key: "bank_name", label: "Bank Name" },
        { key: "bank_branch", label: "Branch" },
        { key: "bank_account_holder", label: "Account Holder Name" },
        { key: "bank_account_number", label: "Account Number" },
        { key: "bank_ifsc", label: "IFSC Code" },
        { key: "upi_id", label: "UPI ID" },
      ],
    },
    {
      title: "Identity",
      fields: [
        { key: "aadhaar_number", label: "Aadhaar Number" },
        { key: "pan_number", label: "PAN Number" },
      ],
    },
  ],
};

export const TRANSPORTER_CONFIG: MasterConfig = {
  table: "transporters",
  entityLabel: "Transporters",
  singular: "transporter",
  icon: Building2,
  hasDepartment: true,
  titleKey: "transporter_name",
  subtitleKeys: ["transporter_type", "city", "department_name"],
  emptyMsg: "Fleet owners, brokers and transport companies you work with.",
  sections: [
    {
      title: "Business identity",
      fields: [
        { key: "transporter_name", label: "Transporter Name", required: true },
        { key: "legal_business_name", label: "Legal Business Name" },
        {
          key: "transporter_type",
          label: "Transporter Type",
          options: ["Fleet Owner", "Broker", "Transport Company", "Individual Owner"],
        },
      ],
    },
    {
      title: "Tax registration",
      fields: [
        { key: "gstin", label: "GSTIN" },
        { key: "pan", label: "PAN" },
        { key: "msme_udyam", label: "MSME / Udyam Number (Optional)" },
        { key: "tan", label: "TAN (Optional)" },
      ],
    },
    {
      title: "Address",
      fields: [
        { key: "address_line1", label: "Address Line 1", full: true },
        { key: "address_line2", label: "Address Line 2", full: true },
        { key: "city", label: "City" },
        { key: "state", label: "State" },
        { key: "country", label: "Country" },
        { key: "pin_code", label: "PIN Code" },
      ],
    },
    {
      title: "Contact",
      fields: [
        { key: "primary_contact_name", label: "Primary Contact Person" },
        { key: "primary_contact_designation", label: "Designation" },
        { key: "mobile_number", label: "Mobile Number" },
        { key: "alternate_mobile", label: "Alternate Mobile" },
        { key: "email", label: "Email", type: "email" },
        { key: "telephone", label: "Telephone" },
        { key: "website", label: "Website (Optional)" },
      ],
    },
    {
      title: "Bank details",
      fields: [
        { key: "bank_name", label: "Bank Name" },
        { key: "bank_branch", label: "Branch" },
        { key: "bank_account_holder", label: "Account Holder Name" },
        { key: "bank_account_number", label: "Account Number" },
        { key: "bank_ifsc", label: "IFSC Code" },
        { key: "upi_id", label: "UPI ID" },
      ],
    },
  ],
};

export const LOCATION_CONFIG: MasterConfig = {
  table: "locations",
  entityLabel: "Locations",
  singular: "location",
  icon: MapPin,
  hasDepartment: false,
  titleKey: "location_name",
  subtitleKeys: ["location_type", "city", "state", "country"],
  emptyMsg: "Pickup, drop and hub locations used across operations.",
  sections: [
    {
      title: "Location",
      fields: [
        { key: "location_name", label: "Location Name", required: true },
        {
          key: "location_type",
          label: "Location Type",
          options: ["Domestic", "International"],
        },
        { key: "city", label: "City" },
        { key: "district", label: "District" },
        { key: "state", label: "State" },
        { key: "country", label: "Country" },
        { key: "pin_code", label: "PIN Code" },
      ],
    },
  ],
};
