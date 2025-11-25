import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export interface RoomStatus {
  roomNumber: string;
  status: "Available" | "Occupied" | "Maintenance";
  currentBooking: {
    guest_name: string;
    mobile: string;
    checkin_date: string;
    checkout_date: string;
    pending_amount: number;
  } | null;
}

interface RoomsStatusSectionProps {
  rooms: RoomStatus[];
}

export const RoomsStatusSection: React.FC<RoomsStatusSectionProps> = ({ rooms }) => {
  // Filter to show only occupied rooms
  const occupiedRooms = rooms.filter((r) => r.currentBooking !== null);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    } catch {
      return dateString;
    }
  };

  if (occupiedRooms.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Occupied Rooms</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No rooms currently occupied</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Occupied Rooms</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBadge}>
            <View style={[styles.statDot, { backgroundColor: "#EF4444" }]} />
            <Text style={styles.statText}>{occupiedRooms.length} Occupied</Text>
          </View>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollView}>
        <View style={styles.roomsGrid}>
          {occupiedRooms.map((room, index) => {
            return (
              <View
                key={room.roomNumber}
                style={styles.roomCardOccupied}
              >
                {/* Room Number & Status */}
                <View style={styles.roomHeader}>
                  <Text style={styles.roomNumber}>{room.roomNumber}</Text>
                  <View style={styles.statusBadgeOccupied}>
                    <View style={styles.statusDotOccupied} />
                    <Text style={styles.statusTextOccupied}>Occupied</Text>
                  </View>
                </View>

                {/* Booking Details */}
                {room.currentBooking && (
                  <View style={styles.bookingDetails}>
                    <View style={styles.guestInfo}>
                      <Text style={styles.guestName} numberOfLines={1}>
                        {room.currentBooking.guest_name}
                      </Text>
                      <Text style={styles.guestMobile}>{room.currentBooking.mobile}</Text>
                    </View>
                    <View style={styles.dateRow}>
                      <View style={styles.dateItem}>
                        <Text style={styles.dateLabel}>Check-in</Text>
                        <Text style={styles.dateValue}>
                          {formatDate(room.currentBooking.checkin_date)}
                        </Text>
                      </View>
                      <View style={styles.dateItem}>
                        <Text style={styles.dateLabel}>Check-out</Text>
                        <Text style={styles.dateValue}>
                          {formatDate(room.currentBooking.checkout_date)}
                        </Text>
                      </View>
                    </View>
                    {room.currentBooking.pending_amount > 0 && (
                      <View style={styles.pendingAmount}>
                        <Text style={styles.pendingLabel}>Pending</Text>
                        <Text style={styles.pendingValue}>
                          ₹{room.currentBooking.pending_amount.toLocaleString("en-IN")}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  scrollView: {
    marginHorizontal: -16,
  },
  roomsGrid: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
  },
  roomCardOccupied: {
    width: 280,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: "#FEE2E2",
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#94A3B8",
    fontWeight: "500",
  },
  roomHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  roomNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
  statusBadgeOccupied: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusDotOccupied: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EF4444",
    marginRight: 6,
  },
  statusTextOccupied: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
    textTransform: "uppercase",
  },
  bookingDetails: {
    marginTop: 8,
  },
  guestInfo: {
    marginBottom: 10,
  },
  guestName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  guestMobile: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  dateRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  dateValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  pendingAmount: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  pendingLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400E",
  },
  pendingValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#B45309",
  },
});

