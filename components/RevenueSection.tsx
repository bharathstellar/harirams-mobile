import React from "react";
import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import { BarChart } from "react-native-chart-kit";

export const RevenueSection = ({ revenueData, navigation }: { revenueData: any, navigation: any }) => {
  const screenWidth = Dimensions.get("window").width;
  const chartWidth = screenWidth + revenueData.monthlyGraph.length * 22; // chart responsive dynamic width

  const monthLabels = revenueData.monthlyGraph.map((m: any) =>
    new Date(m.month?.split("-")[0], +m.month?.split("-")[1] - 1).toLocaleString("en-IN", { month: "short" })
  );

  const monthValues = revenueData.monthlyGraph.map((m: any) => m.revenue);

  const chartConfig = {
    backgroundColor: "#fff",
    backgroundGradientFrom: "#fff",
    backgroundGradientTo: "#fff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
    labelColor: () => "#64748B",
    propsForBackgroundLines: {
      stroke: "#E5E7EB",
    },
    barPercentage: 0.4,
  };

  return (
    <ScrollView style={styles.main} showsVerticalScrollIndicator={false}>

      <Text style={styles.title}>Revenue Overview</Text>

      {/* Responsive 4 Summary Cards */}
      <View style={styles.cardContainer}>
        {[
          { label: "Today", value: revenueData.todayRevenue, color: "#22C55E" },
          { label: "Week", value: revenueData.weekRevenue, color: "#3B82F6" },
          { label: "Month", value: revenueData.monthRevenue, color: "#F59E0B" },
          { label: "Total", value: revenueData.totalRevenue, color: "#8B5CF6" },
        ].map((item, i) => (
          <View key={i} style={[styles.card, { backgroundColor: item.color }]}>
            <Text style={styles.cardText}>{item.label}</Text>
            <Text style={styles.cardAmount}>₹{item.value.toLocaleString("en-IN")}</Text>
          </View>
        ))}
      </View>

      {/* Chart */}
      <Text style={styles.sectionTitle}>Monthly Revenue</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <BarChart
          data={{ labels: monthLabels, datasets: [{ data: monthValues }] }}
          width={chartWidth}
          height={230}
          chartConfig={chartConfig}
          fromZero
          showValuesOnTopOfBars
          yAxisLabel=""
          yAxisSuffix=""
          style={{ borderRadius: 12, marginTop: 10 }}
        />
      </ScrollView>

      {/* Payment Mode */}
      <Text style={styles.sectionTitle}>Payment Mode Split</Text>
      {revenueData.revenueByPaymentMode.map((item: any, i: any) => {
        const percent = Math.round((item.total / revenueData.totalRevenue) * 100);
        return (
          <View key={i} style={styles.paymentRow}>
            <View style={[styles.dot, { backgroundColor: COLORS[i % COLORS.length] }]} />
            <Text style={styles.mode}>{item.mode}</Text>
            <Text style={styles.percent}>{percent}%</Text>
            <Text style={styles.amount}>₹{item.total.toLocaleString("en-IN")}</Text>
          </View>
        );
      })}


    </ScrollView>
  );
};

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

const styles = StyleSheet.create({
  main: { padding: 12, backgroundColor: "#F8FAFC" },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 14, color: "#0F172A" },

  cardContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    width: "48%",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  cardText: { fontSize: 13, color: "#fff", fontWeight: "600" },
  cardAmount: { marginTop: 6, fontSize: 20, fontWeight: "900", color: "white" },

  sectionTitle: { fontSize: 18, fontWeight: "700", marginTop: 22, marginBottom: 10, color: "#0F172A" },

  paymentRow: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  mode: { flex: 1, fontSize: 15, fontWeight: "600", color: "#0F172A" },
  percent: { marginRight: 12, fontSize: 14, color: "#475569" },
  amount: { fontSize: 16, fontWeight: "800", color: "#0F172A" },

  button: {
    backgroundColor: "#16A34A",
    padding: 16,
    borderRadius: 50,
    alignSelf: "center",
    marginTop: 25,
    marginBottom: 25,
    width: "88%",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
});
