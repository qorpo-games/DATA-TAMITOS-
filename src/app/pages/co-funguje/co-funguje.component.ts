import { Component } from '@angular/core';
import { EvidenceBadgeComponent } from '../../shared/evidence-badge.component';
import { FUNGUJE, SKUMA, VYHNITE, RED_FLAGS } from '../../data/guide.data';
import { GuideItem } from '../../models/models';

/** Stránka „Čo funguje a čo nie" — flagship sekcia, dátovo riadená. */
@Component({
  selector: 'th-co-funguje',
  standalone: true,
  imports: [EvidenceBadgeComponent],
  templateUrl: './co-funguje.component.html',
  styleUrl: './co-funguje.component.scss',
})
export class CoFungujeComponent {
  funguje: GuideItem[] = FUNGUJE;
  skuma: GuideItem[] = SKUMA;
  vyhnite: GuideItem[] = VYHNITE;
  redFlags: string[] = RED_FLAGS;
}
