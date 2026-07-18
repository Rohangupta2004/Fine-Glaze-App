import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, G, Rect, Text as SvgText } from 'react-native-svg';
import { colors } from '../theme/colors';
import { fontFamily } from '../theme/typography';

interface AreaChartProps {
  data: number[];
  labels: string[];
  width?: number;
  height?: number;
  strokeColor?: string;
  fillColor?: string;
}

export function AreaChart({
  data,
  labels,
  width = 320,
  height = 160,
  strokeColor = '#695030',
  fillColor = '#8B6840',
}: AreaChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.center, { width, height }]}>
        <Text style={styles.noData}>No data available</Text>
      </View>
    );
  }

  const maxVal = Math.max(...data, 1);
  const minVal = Math.min(...data, 0);
  const range = maxVal - minVal;

  const paddingLeft = 35;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const points = data.map((val, idx) => {
    const x = paddingLeft + (idx / (data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - ((val - minVal) / range) * chartHeight;
    return { x, y };
  });

  // Generate SVG path for line
  const pathD = points.reduce((acc, p, idx) => {
    if (idx === 0) return `M ${p.x} ${p.y}`;
    // Curve control points
    const prev = points[idx - 1];
    const cpX1 = prev.x + (p.x - prev.x) / 2;
    const cpY1 = prev.y;
    const cpX2 = prev.x + (p.x - prev.x) / 2;
    const cpY2 = p.y;
    return acc + ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p.x} ${p.y}`;
  }, '');

  // Generate SVG path for area fill
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const areaD = `${pathD} L ${lastPoint.x} ${paddingTop + chartHeight} L ${firstPoint.x} ${paddingTop + chartHeight} Z`;

  // Grid line values
  const gridLinesCount = 3;
  const gridLines = Array.from({ length: gridLinesCount }, (_, i) => {
    const ratio = i / (gridLinesCount - 1);
    const y = paddingTop + ratio * chartHeight;
    const value = Math.round(maxVal - ratio * range);
    return { y, value };
  });

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="chartAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={fillColor} stopOpacity={0.35} />
            <Stop offset="100%" stopColor={fillColor} stopOpacity={0.0} />
          </LinearGradient>
        </Defs>

        {/* Grid Lines & Y-Labels */}
        {gridLines.map((line, idx) => (
          <G key={idx}>
            <Path
              d={`M ${paddingLeft} ${line.y} L ${width - paddingRight} ${line.y}`}
              stroke="rgba(105, 80, 48, 0.08)"
              strokeWidth={1}
              strokeDasharray={idx === 1 ? '4 4' : undefined}
            />
            <SvgText
              x={paddingLeft - 8}
              y={line.y + 4}
              fontSize="10"
              fontFamily={fontFamily.medium}
              fill="#8A7E72"
              textAnchor="end"
            >
              {line.value}
            </SvgText>
          </G>
        ))}

        {/* Shaded Area */}
        <Path d={areaD} fill="url(#chartAreaGrad)" />

        {/* Line Curve */}
        <Path d={pathD} fill="none" stroke={strokeColor} strokeWidth={2.5} strokeLinecap="round" />

        {/* Coordinates Circles */}
        {points.map((p, idx) => (
          <Circle
            key={idx}
            cx={p.x}
            cy={p.y}
            r={4.5}
            fill="#FFFFFF"
            stroke={strokeColor}
            strokeWidth={2.5}
          />
        ))}

        {/* X-Labels */}
        {labels.map((lbl, idx) => {
          const x = paddingLeft + (idx / (labels.length - 1)) * chartWidth;
          return (
            <SvgText
              key={idx}
              x={x}
              y={height - 8}
              fontSize="10"
              fontFamily={fontFamily.medium}
              fill="#8A7E72"
              textAnchor="middle"
            >
              {lbl}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

interface BarChartProps {
  data: number[];
  labels: string[];
  colors?: string[];
  width?: number;
  height?: number;
}

export function BarChart({
  data,
  labels,
  colors: barColors = ['#695030', '#8B5CF6', '#10B981', '#3B82F6'],
  width = 320,
  height = 160,
}: BarChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.center, { width, height }]}>
        <Text style={styles.noData}>No data available</Text>
      </View>
    );
  }

  const maxVal = Math.max(...data, 1);
  const paddingLeft = 35;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const barWidth = Math.min(28, (chartWidth / data.length) * 0.5);
  const step = chartWidth / data.length;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {/* Y Axis line */}
        <Path
          d={`M ${paddingLeft} ${paddingTop} L ${paddingLeft} ${paddingTop + chartHeight}`}
          stroke="rgba(105, 80, 48, 0.08)"
          strokeWidth={1}
        />
        
        {/* X Axis line */}
        <Path
          d={`M ${paddingLeft} ${paddingTop + chartHeight} L ${width - paddingRight} ${paddingTop + chartHeight}`}
          stroke="rgba(105, 80, 48, 0.08)"
          strokeWidth={1}
        />

        {/* Grid lines */}
        {[0, 0.5, 1].map((ratio, idx) => {
          const y = paddingTop + ratio * chartHeight;
          const val = Math.round(maxVal * (1 - ratio));
          return (
            <G key={idx}>
              <Path
                d={`M ${paddingLeft} ${y} L ${width - paddingRight} ${y}`}
                stroke="rgba(105, 80, 48, 0.05)"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <SvgText
                x={paddingLeft - 8}
                y={y + 4}
                fontSize="10"
                fontFamily={fontFamily.medium}
                fill="#8A7E72"
                textAnchor="end"
              >
                {val}
              </SvgText>
            </G>
          );
        })}

        {/* Render Bars */}
        {data.map((val, idx) => {
          const barHeight = (val / maxVal) * chartHeight;
          const x = paddingLeft + idx * step + (step - barWidth) / 2;
          const y = paddingTop + chartHeight - barHeight;
          const barColor = barColors[idx % barColors.length];

          return (
            <G key={idx}>
              {/* Rounded top rect */}
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={4}
                ry={4}
                fill={barColor}
              />
              {/* Text value above bar */}
              {val > 0 && (
                <SvgText
                  x={x + barWidth / 2}
                  y={y - 5}
                  fontSize="10"
                  fontFamily={fontFamily.bold}
                  fill="#1E1815"
                  textAnchor="middle"
                >
                  {val}
                </SvgText>
              )}
              {/* X label */}
              <SvgText
                x={x + barWidth / 2}
                y={height - 8}
                fontSize="9"
                fontFamily={fontFamily.medium}
                fill="#8A7E72"
                textAnchor="middle"
              >
                {labels[idx]}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  noData: {
    fontSize: 12,
    color: '#8A7E72',
    fontFamily: fontFamily.medium,
  },
});
