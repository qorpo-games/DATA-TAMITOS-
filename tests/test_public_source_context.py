import pathlib
import unittest


class PublicSourceContextTests(unittest.TestCase):
    def test_secondary_dashboard_is_not_relabelled_as_our_statistic(self):
        page = (pathlib.Path(__file__).parents[1] / 'src/app/pages/data/data.component.ts').read_text(encoding='utf-8')
        self.assertNotRegex(page.lower(), r'kompasio|modrá hliadka|modra-hliadka|35\s?029')
        self.assertIn('Vlastný overený slovenský agregát diagnóz zatiaľ nie je napojený', page)
        for source in ('Tamitos', 'CVTI SR', 'MPSVR SR', 'e-VÚC'):
            self.assertIn(source, page)
