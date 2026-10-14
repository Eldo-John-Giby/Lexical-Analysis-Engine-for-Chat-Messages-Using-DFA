import React from 'react';

export const BenchmarksPage: React.FC = () => {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-[#E6EAF5] mb-2">DFA Benchmarks & ReDoS Showdown</h2>
      <p className="text-sm text-[#8A94B2]">Throughput benchmarks and polynomial DFA vs exponential regex backtracking showdown.</p>
    </div>
  );
};
