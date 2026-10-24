"use client";

import LeaseHighlight from "@/components/LeaseHighlight";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
type Property= {
  id: number;
  name: string;
  address: string;
  userId: string;
};
export default function PropertiesClient(){
  const searchParams= useSearchParams();
  const propertyId = searchParams.get("propertyId");
  const [properties, setProperties]= useState<Property[]>([]);
  const [name, setName]= useState("");
  const [address, setAddress]= useState("");
  const [selectedPropertyId, setSelectedPropertyId]= useState<number | null>(null);
  const [loading, setLoading]= useState(false);
  useEffect(()=>{
  fetch("/api/properties")
  .then((response)=> response.json())
  .then((data)=> setProperties(data));
},[]);

async function createProperty() {
  if (!name.trim() || !address.trim()) {
    alert("Please enter both property name and address");
    return;
  }

    setLoading(true);
  try{
  const response = await fetch("/api/properties", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      address,
    }),
  });

  const text = await response.text();

  console.log("STATUS:", response.status);
  console.log("RESPONSE:", text);

  if (!response.ok) {
    alert(`Error ${response.status}: ${text || "Empty response"}`);
    return;
  }

  const property = JSON.parse(text);

  setProperties((current)=>[...current, property]);
  setName("");
  setAddress("");
} catch (error){
    console.log("CREATE PROPERTY ERROR:", error);
    alert("Something went wrong while creating the property.")
} finally{
    setLoading(false);
}
}
async function updateProperty() {
 if (selectedPropertyId === null) {
    alert("Please select a property to update");
    return;
  }
   if (!name.trim() || !address.trim()) {
    alert("Please enter both property name and address");
    return;
  }

    setLoading(true);
  try{
  const response = await fetch("/api/properties", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      propertyId: selectedPropertyId,
      name,
      address,
    }),
  });

  const text = await response.text();

  console.log("STATUS:", response.status);
  console.log("RESPONSE:", text);

  if (!response.ok) {
    alert(`Error ${response.status}: ${text || "Empty response"}`);
    return;
  }

  const property = JSON.parse(text);

  setProperties((current)=>
  current.map((item)=>
    item.id=== selectedPropertyId
    ? {...item, name: property.name, address: property.address}
    : item
)
  );
  setSelectedPropertyId(null);
  setName("");
  setAddress("");
} catch (error){
    console.log("CREATE PROPERTY ERROR:", error);
    alert("Something went wrong while updating the property.")
} finally{
    setLoading(false);
}
}
async function deleteProperty(propertyId: number){
   setLoading(true);
  try{
    const response = await fetch("/api/properties",{
      method: "DELETE",
      headers:{
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
       propertyId,
    }),
    });

    const text = await response.text();
    console.log("STATSU:",response.status);
    console.log("RESPONSE:", text);
 if (!response.ok) {
    alert(`Error ${response.status}: ${text || "Empty response"}`);
    return;
  }
  setProperties((current)=>
  current.filter((property)=> property.id !== propertyId)
  );
  setSelectedPropertyId(null);
  setName("");
  setAddress("");
 }catch(error){
  console.log("DELETE PROPERTY ERROR:", error);
  alert("Something went wrong while deleteing the property.");
 }
  finally{
    setLoading(false);
  }
}
  return (

  <main className="mx-auto w-full max-w-6xl space-y-6">
    {propertyId && (
      <Suspense fallback={null}>
        <LeaseHighlight targetId={`property-${propertyId}`}/>
      </Suspense>
    )}
    <header>
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
        Properties
      </h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Manage your properties, addresses, and units.
      </p>
    </header>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
    {selectedPropertyId !== null ? "Edit Property" : "Add a Property"}
  </h2>
  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
    {selectedPropertyId !== null
      ? "Update the property details below."
      : "Enter the name and address of your property."}
  </p>

  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
    <div>
      <label
        htmlFor="property-name"
        className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        Property name
      </label>
      <input
        id="property-name"
        type="text"
        placeholder="e.g. Green Villa"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
      />
    </div>

<div>
  <label
    htmlFor="property-address"
    className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
  >
    Property address
  </label>
  <input
    id="property-address"
    type="text"
    placeholder="Enter the full address"
    value={address}
    onChange={(e) => setAddress(e.target.value)}
    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
  />
</div>

  </div>

  <div className="mt-4 flex flex-wrap gap-3">
    <button
      type="button"
      onClick={selectedPropertyId !== null ? updateProperty : createProperty}
      disabled={loading}
      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading
        ? "Saving..."
        : selectedPropertyId !== null
          ? "Update Property"
          : "Add Property"}
    </button>

{selectedPropertyId !== null && (
  <button
    type="button"
    onClick={() => {
      setSelectedPropertyId(null);
      setName("");
      setAddress("");
    }}
    disabled={loading}
    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
  >
    Cancel Edit
  </button>
)}

  </div>
</section>

      <section className="space-y-4">
  <div className="flex items-center justify-between">
    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
      Your Properties
    </h2>
    <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
      {properties.length} {properties.length === 1 ? "property" : "properties"}
    </span>
  </div>

  {properties.length === 0 ? (
    <div className="rounded-xl border border-dashed border-gray-300 px-4 py-10 text-center dark:border-gray-700">
      <h3 className="font-medium text-gray-900 dark:text-white">
        No properties yet
      </h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Add your first property using the form above.
      </p>
    </div>
  ) : (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {properties.map((property) => (
        <article
  id={`property-${property.id}`}
  key={property.id}
          onClick={() => {
            window.location.href = `/properties/${property.id}/units`;
          }}
          className="cursor-pointer rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-700"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="break-words text-lg font-semibold text-gray-900 dark:text-white">
                {property.name}
              </h3>
              <p className="mt-2 break-words text-sm leading-6 text-gray-600 dark:text-gray-400">
                {property.address}
              </p>
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-500">
                Property ID: {property.id}
              </p>
            </div>

            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPropertyId(property.id);
                  setName(property.name);
                  setAddress(property.address);
                }}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Edit
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={(e) => {
                  e.stopPropagation();
                  const confirmed = window.confirm(
                    `Are you sure you want to delete "${property.name}"?`
                  );
                  if (confirmed) {
                    deleteProperty(property.id);
                  }
                }}
                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
              >
                Delete
              </button>
            </div>
          </div>

          <div className="mt-4 border-t border-gray-100 pt-3 text-sm font-medium text-blue-600 dark:border-gray-700 dark:text-blue-400">
            View units →
          </div>
        </article>
      ))}
    </div>
  )}
</section>
    </main>
  )
}