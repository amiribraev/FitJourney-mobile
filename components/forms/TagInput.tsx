import { colors } from '@/constants/theme';
import { type FilterCategory, findFilterKey, getFilterLabel, searchFilterOptions } from '@/lib/filterDictionary';
import { useI18n } from '@/lib/i18n';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Props = {
  category: FilterCategory;
  label: string;
  values: string[];
  placeholder?: string;
  multiline?: boolean;
  onChange: (values: string[]) => void;
};

function normalize(value: string) {
  return value.trim();
}

export function TagInput({ category, label, values, placeholder, multiline, onChange }: Props) {
  const { t, language } = useI18n();
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const examples = searchFilterOptions(category, '').slice(0, 2).map((item) => item.label[language]);

  const normalizedValues = useMemo(() => values.map((item) => item.toLowerCase()), [values]);
  const normalizedQuery = query.trim().toLowerCase();

  const filteredSuggestions = useMemo(() => {
    return searchFilterOptions(category, normalizedQuery).filter((item) => !normalizedValues.includes(item.key));
  }, [normalizedQuery, category, normalizedValues]);

  const add = useCallback((value: string) => {
    const next = normalize(value);
    if (!next) return;
    const exactKey = findFilterKey(category, next);
    if (!exactKey) {
      setError(t('tagInput.invalidValue'));
      return;
    }
    if (normalizedValues.includes(exactKey)) {
      setQuery('');
      setError(null);
      return;
    }
    onChange([...values, exactKey]);
    setQuery('');
    setError(null);
  }, [values, onChange, normalizedValues, t, category]);

  const remove = useCallback((value: string) => {
    onChange(values.filter((item) => item !== value));
  }, [values, onChange]);

  return (
    <View style={styles.block}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        placeholder={placeholder ?? `${t('tagInput.examplePrefix')}: ${examples.join(', ')}`}
        value={query}
        onChangeText={(text) => {
          setQuery(text);
          setError(null);
        }}
        onSubmitEditing={() => add(query)}
        returnKeyType="done"
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
      {!!normalizedQuery && (
        <View style={styles.suggestions}>
          {filteredSuggestions.length > 0 ? (
            filteredSuggestions.map((item) => (
              <Pressable
                key={item.key}
                style={styles.suggestionItem}
                onPress={() => {
                  onChange([...values, item.key]);
                  setQuery('');
                  setError(null);
                }}
              >
                <Text style={styles.suggestionText}>{item.label[language]}</Text>
              </Pressable>
            ))
          ) : (
            <Text style={styles.noResults}>{t('tagInput.noMatch')}</Text>
          )}
        </View>
      )}
      {!!error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.tags}>
        {values.map((item, index) => (
          <TouchableOpacity key={`${item}-${index}`} style={styles.tag} onPress={() => remove(item)}>
            <Text style={styles.tagText}>{getFilterLabel(category, item, language)} x</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: 12 },
  label: { fontSize: 14, fontWeight: '600', color: colors.textMuted, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  inputMultiline: {
    minHeight: 72,
    paddingTop: 10,
    paddingBottom: 10,
  },
  suggestions: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  suggestionText: {
    fontSize: 14,
    color: colors.text,
  },
  noResults: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.textMuted,
  },
  error: {
    marginTop: 6,
    color: colors.danger,
    fontSize: 12,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  tag: {
    backgroundColor: '#DBEAFE',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  tagText: { color: '#1E40AF', fontSize: 13, fontWeight: '600' },
});
