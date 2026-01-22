#!/usr/bin/env bash

set -euo pipefail

version_lt() {
  local v1="$1"
  local v2="$2"

  # Remove 'v' prefix if present
  v1="${v1#v}"
  v2="${v2#v}"

  # Split versions into major, minor, patch
  IFS='.' read -r v1_major v1_minor v1_patch <<< "$v1"
  IFS='.' read -r v2_major v2_minor v2_patch <<< "$v2"

  # Compare major version
  if [ "$v1_major" -lt "$v2_major" ]; then
    return 0
  elif [ "$v1_major" -gt "$v2_major" ]; then
    return 1
  fi

  # Compare minor version
  if [ "$v1_minor" -lt "$v2_minor" ]; then
    return 0
  elif [ "$v1_minor" -gt "$v2_minor" ]; then
    return 1
  fi

  # Compare patch version
  if [ "$v1_patch" -lt "$v2_patch" ]; then
    return 0
  else
    return 1
  fi
}

should_update() {
  local policy="$1"
  local current_version="$2"
  local new_version="$3"

  # Remove 'v' prefix if present
  current_version="${current_version#v}"
  new_version="${new_version#v}"

  # Split versions into major, minor, patch
  IFS='.' read -r cur_major cur_minor cur_patch <<< "$current_version"
  IFS='.' read -r new_major new_minor new_patch <<< "$new_version"

  # Reject if not newer
  if ! version_lt "$current_version" "$new_version"; then
    return 1
  fi

  case "$policy" in
    none)
      return 1
      ;;
    patch)
      if [ "$cur_major" -eq "$new_major" ] && [ "$cur_minor" -eq "$new_minor" ]; then
        return 0
      else
        return 1
      fi
      ;;
    minor)
      if [ "$cur_major" -eq "$new_major" ]; then
        return 0
      else
        return 1
      fi
      ;;
    major)
      return 0
      ;;
    *)
      echo "Unknown policy: $policy" >&2
      return 1
      ;;
  esac
}
