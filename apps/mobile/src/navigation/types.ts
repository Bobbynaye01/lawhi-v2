import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DivisionKind } from '@lawhi/shared';

export type TabParamList = {
  Home: undefined;
  Quran: undefined;
  Prayer: undefined;
  Qibla: undefined;
  Adhkar: undefined;
};

export type ReaderTarget =
  { kind: 'surah'; number: number; verse?: number } | { kind: DivisionKind; number: number };

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  QuranReader: ReaderTarget;
  QuranSearch: undefined;
  Bookmarks: undefined;
  AdhkarCategory: { id: string };
  Tasbih: undefined;
  Library: undefined;
  BookDetail: { bookId: string };
  BookChapter: { bookId: string; chapterId: string };
  PdfReader: { bookId: string };
  Donations: undefined;
  DonationForm: { causeId: string };
  DonationDetail: { donationId: string };
  MyDonations: undefined;
  Settings: undefined;
  CityPicker: undefined;
  Account: undefined;
  SignIn: { redirect?: 'Donations' | 'MyDonations' } | undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
};

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
