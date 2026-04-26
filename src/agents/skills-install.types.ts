export type SkillInstallResult = {
  ok: boolean;
  message: string;
  stdout: string;
  stderr: string;
  code: number | null;
  incompatible?: boolean;
  recreateSuggested?: boolean;
  warnings?: string[];
};
