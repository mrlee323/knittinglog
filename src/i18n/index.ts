/**
 * i18n 골격.
 *
 * 나중에 붙이면 전 화면을 다시 까야 하므로 MVP부터 넣는다.
 *
 * UI 문자열(`ui/`)과 도안 용어 사전(`stitches/`)은 **분리한다**.
 * 성격이 다르기 때문이다. UI 문자열은 번역가가 자유롭게 옮기지만,
 * 도안 용어는 기호 체계라 정확한 대응만 허용된다. (기획 §4)
 */

import { atom, useAtomValue } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { en } from "./ui/en";
import { ko, type UIStrings } from "./ui/ko";

export const LOCALES = ["ko", "en"] as const;
export type Locale = (typeof LOCALES)[number];

const BUNDLES: Record<Locale, UIStrings> = { ko, en };

export const localeAtom = atomWithStorage<Locale>("knittinglog:locale", "ko");

export const stringsAtom = atom((get) => BUNDLES[get(localeAtom)]);

export const useStrings = () => useAtomValue(stringsAtom);
export const useLocale = () => useAtomValue(localeAtom);
