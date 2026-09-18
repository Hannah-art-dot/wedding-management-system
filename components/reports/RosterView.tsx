"use client";

import React from "react";
import styles from "./RosterView.module.css";
import { Side, type Side as SideType } from "@/lib/enums";
import { useRouter, useSearchParams } from "next/navigation";

// Define the shape of a grouped guest
export type RosterGuest = {
  id: string;
  fullName: string;
  familyName: string;
  side: SideType;
  category: string;
  familyStatus: string;
  numberAllowed: number;
};

export type RosterGroup = {
  letter: string;
  guests: RosterGuest[];
};

export function RosterView({ groups }: { groups: RosterGroup[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSide = searchParams.get("side") || "ALL";

  const handleFilter = (side: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (side === "ALL") {
      params.delete("side");
    } else {
      params.set("side", side);
    }
    router.push(`?${params.toString()}`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <button
            className={`${styles.filterBtn} ${currentSide === "ALL" ? styles.filterBtnActive : ""}`}
            onClick={() => handleFilter("ALL")}
          >
            All Guests
          </button>
          <button
            className={`${styles.filterBtn} ${currentSide === Side.BRIDE ? styles.filterBtnActive : ""}`}
            onClick={() => handleFilter(Side.BRIDE)}
          >
            Bride's Side
          </button>
          <button
            className={`${styles.filterBtn} ${currentSide === Side.GROOM ? styles.filterBtnActive : ""}`}
            onClick={() => handleFilter(Side.GROOM)}
          >
            Groom's Side
          </button>
        </div>
        <button className={styles.printBtn} onClick={handlePrint}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9V2h12v7" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect width="12" height="8" x="6" y="14" />
          </svg>
          Print Guest List
        </button>
      </div>

      <h1 className={styles.rosterTitle}>Printable Guest List</h1>

      {groups.length === 0 && (
        <div style={{ textAlign: "center", color: "var(--muted-foreground)" }}>
          No guests found for this filter.
        </div>
      )}

      {groups.map((group) => (
        <div key={group.letter} className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.letter}>{group.letter}</h2>
            <span className={styles.count}>{group.guests.length} {group.guests.length === 1 ? 'Guest' : 'Guests'}</span>
          </div>
          <table className={`${styles.table} table-auto w-full border-collapse`}>
            <thead>
              <tr>
                <th className="w-12 min-w-[3rem] px-2 text-center whitespace-nowrap font-mono">
                  [ &nbsp; ]
                </th>
                <th>Full Name</th>
                <th>Family Name</th>
                <th>Side</th>
                <th>Category</th>
                <th>No. Allowed</th>
                <th>Family Status</th>
                <th>Card Status</th>
                <th>Checked In</th>
              </tr>
            </thead>
            <tbody>
              {group.guests.map((guest) => (
                <tr key={guest.id}>
                  <td className="w-12 min-w-[3rem] px-2 text-center whitespace-nowrap font-mono">
                    [ &nbsp; ]
                  </td>
                  <td style={{ fontWeight: 500 }}>{guest.fullName}</td>
                  <td>{guest.familyName}</td>
                  <td>{guest.side === Side.BRIDE ? "Bride" : guest.side === Side.GROOM ? "Groom" : "Neutral"}</td>
                  <td>{guest.category || "—"}</td>
                  <td>{guest.numberAllowed}</td>
                  <td>{guest.familyStatus || "—"}</td>
                  <td className={styles.blankCell}>_____</td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
