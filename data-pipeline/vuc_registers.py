"""Compatibility entry point: official IS SoS CSV + e-VUC medical registers.

The former unimplemented per-region scaffolding has been retired. New code should
use public_registers.collect() and retain its per-source health report.
"""
from public_registers import collect

def run_all():
    report = collect()
    if not report['complete']:
        raise RuntimeError('Incomplete public register refresh: ' + ', '.join(x['id'] for x in report['sources'] if x['status'] != 'ok'))
    return report['items']

if __name__ == '__main__':
    report = collect()
    for source in report['sources']:
        print(source['id'], source['status'], source.get('records', 'unknown'))
    print('complete:', report['complete'])
