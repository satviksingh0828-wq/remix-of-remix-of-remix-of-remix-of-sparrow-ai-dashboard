import { supabase } from "@/integrations/supabase/client";

export type EmployeeDocumentRecord = {
  id: string;
  employee_id: string;
  original_name: string;
  mime_type: string;
  size: number;
  created_at: string;
  updated_at: string;
};

const BUCKET = "employee-documents";

export const employeeDocumentsApi = {
  async list(employeeId: string) {
    const db = supabase as any;
    const { data, error } = await db
      .from("employee_documents")
      .select("*")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as EmployeeDocumentRecord[];
  },

  async upload(employeeId: string, file: File) {
    const id = crypto.randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${employeeId}/${id}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const db = supabase as any;
    const { data, error } = await db
      .from("employee_documents")
      .insert({
        id,
        employee_id: employeeId,
        original_name: file.name,
        mime_type: file.type || "application/octet-stream",
        size: file.size,
        storage_path: path,
      })
      .select()
      .single();
    if (error) {
      await supabase.storage.from(BUCKET).remove([path]);
      throw error;
    }
    return data as EmployeeDocumentRecord;
  },

  async get(documentId: string) {
    const db = supabase as any;
    const { data: doc, error } = await db
      .from("employee_documents")
      .select("*")
      .eq("id", documentId)
      .single();
    if (error) throw error;
    const { data: signed, error: signedError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl((doc as EmployeeDocumentRecord & { storage_path: string }).storage_path, 300);
    if (signedError || !signed?.signedUrl) throw signedError ?? new Error("Could not open document");
    return {
      data_url: signed.signedUrl,
      original_name: (doc as EmployeeDocumentRecord).original_name,
    };
  },

  async remove(documentId: string) {
    const db = supabase as any;
    const { data: doc, error } = await db
      .from("employee_documents")
      .select("storage_path")
      .eq("id", documentId)
      .single();
    if (error) throw error;
    const path = (doc as { storage_path: string }).storage_path;
    const { error: removeError } = await supabase.storage.from(BUCKET).remove([path]);
    if (removeError) throw removeError;
    const { error: deleteError } = await db.from("employee_documents").delete().eq("id", documentId);
    if (deleteError) throw deleteError;
  },
};