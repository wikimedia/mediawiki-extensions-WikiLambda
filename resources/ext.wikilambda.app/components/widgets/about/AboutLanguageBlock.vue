<!--
	WikiLambda Vue component - About Widget Language Block
	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-about-language-block" data-testid="about-language-block">
		<!-- Read mode -->
		<div v-if="!edit" class="ext-wikilambda-app-about-language-block__read">
			<div class="ext-wikilambda-app-about-language-block__fields">
				<!-- No descriptions or aliases message -->
				<div v-if="!hasDescription && !hasAliases" class="ext-wikilambda-app-about-language-block__unavailable">
					{{ i18n( 'wikilambda-about-widget-no-descriptions-or-aliases' ).text() }}
				</div>
				<template v-else>
					<!-- Description block -->
					<div class="ext-wikilambda-app-about-language-block__description" data-testid="about-description">
						<span v-if="hasDescription" class="ext-wikilambda-app-about-language-block__value">
							{{ viewData.description.value }}
						</span>
						<span v-else class="ext-wikilambda-app-about-language-block__unavailable">
							{{ i18n( 'wikilambda-about-widget-no-descriptions' ).text() }}
						</span>
					</div>
					<!-- Aliases block -->
					<div class="ext-wikilambda-app-about-language-block__aliases" data-testid="about-aliases">
						<template v-if="hasAliases">
							<cdx-info-chip
								v-for="( alias, index ) in visibleAliases"
								:key="`alias-${ index }`"
								class="ext-wikilambda-app-about-language-block__alias"
								data-testid="about-alias">
								{{ alias }}
							</cdx-info-chip>
							<a
								v-if="viewData.aliases.value.length > 3 && !seeAllAliases"
								class="ext-wikilambda-app-about-language-block__aliases-more"
								@click="seeAllAliases = true"
							>+{{ viewData.aliases.value.length - 3 }}</a>
						</template>
						<span v-else class="ext-wikilambda-app-about-language-block__unavailable">
							{{ i18n( 'wikilambda-about-widget-no-aliases' ).text() }}
						</span>
					</div>
				</template>
			</div>
			<!-- Function specific fields -->
			<div v-if="isFunction" class="ext-wikilambda-app-about-language-block__function-fields">
				<div class="ext-wikilambda-app-about-language-block__inputs">
					<!-- Inputs -->
					<div class="ext-wikilambda-app-about-language-block__field-title">
						{{ i18n( 'wikilambda-function-definition-inputs-label' ).text() }}
					</div>
					<ul
						v-if="viewData.inputs.length > 0"
						class="ext-wikilambda-app-list-reset
							ext-wikilambda-app-about-language-block__inputs-list">
						<li
							v-for="input in viewData.inputs"
							:key="input.key"
							class="ext-wikilambda-app-about-language-block__field-value
								ext-wikilambda-app-about-language-block__input">
							<span
								v-if="input.value"
								class="ext-wikilambda-app-about-language-block__input-label"
							>{{ input.value }}<span>{{ i18n( 'colon-separator' ).text() }}</span>
							</span>
							<span
								v-else
								class="ext-wikilambda-app-about-language-block__input-label
									ext-wikilambda-app-about-language-block__unavailable"
							>{{
								i18n( 'wikilambda-editor-default-name' ).text()
							}}<span>{{ i18n( 'colon-separator' ).text() }}&nbsp;</span>
							</span><wl-z-object-to-string
								:key-path="input.typeKeyPath"
								:object-value="input.type"
								:edit="edit"
							></wl-z-object-to-string>
						</li>
					</ul>
					<div v-else class="ext-wikilambda-app-about-language-block__field-value">
						<span class="ext-wikilambda-app-about-language-block__unavailable">
							{{ i18n( 'wikilambda-about-widget-no-inputs' ).text() }}
						</span>
					</div>
				</div>
				<!-- Output -->
				<div class="ext-wikilambda-app-about-language-block__output">
					<div class="ext-wikilambda-app-about-language-block__field-title">
						{{ i18n( 'wikilambda-function-definition-output-label' ).text() }}
					</div>
					<div class="ext-wikilambda-app-about-language-block__field-value">
						<wl-z-object-to-string
							:key-path="outputTypeKeyPath"
							:object-value="outputType"
							:edit="edit"
						></wl-z-object-to-string>
					</div>
				</div>
			</div>
		</div>
		<!-- Edit mode -->
		<div v-else class="ext-wikilambda-app-about-language-block__edit">
			<!-- Name field -->
			<cdx-field
				class="ext-wikilambda-app-about-language-block__edit-field"
				data-testid="about-name-field"
			>
				<cdx-text-input
					:model-value="editData.name.value"
					:placeholder="i18n( 'wikilambda-about-widget-name-placeholder' ).text()"
					:maxlength="maxNameChars"
					data-testid="text-input"
					@update:model-value="updateEditValue( editData.name, $event )"
					@change="changeEditValue"
				></cdx-text-input>
				<template #label>
					<span
						:lang="nameLabelData.langCode"
						:dir="nameLabelData.langDir"
					>{{ nameLabelData.label }}</span>
				</template>
				<template #help-text>
					<div class="ext-wikilambda-app-about-language-block__edit-field-caption">
						<template v-if="fallbackName">
							<span
								:lang="fallbackName.lang.langCode"
								:dir="fallbackName.lang.langDir"
							>{{ fallbackName.lang.label }}</span>{{ i18n( 'colon-separator' ).text() }}
							{{ fallbackName.value }}
						</template>
					</div>
					<div class="ext-wikilambda-app-about-language-block__edit-field-counter">
						{{ nameCharsLeft }}
					</div>
				</template>
			</cdx-field>
			<!-- Description field -->
			<cdx-field
				class="ext-wikilambda-app-about-language-block__edit-field"
				data-testid="about-description-field"
			>
				<cdx-text-area
					:model-value="editData.description.value"
					:placeholder="i18n( 'wikilambda-about-widget-description-placeholder' ).text()"
					:maxlength="maxDescriptionChars"
					data-testid="text-area"
					@update:model-value="updateEditValue( editData.description, $event )"
					@change="changeEditValue"
				></cdx-text-area>
				<template #label>
					<span
						:lang="descriptionLabelData.langCode"
						:dir="descriptionLabelData.langDir"
					>{{ descriptionLabelData.label }}</span>
				</template>
				<template #help-text>
					<div class="ext-wikilambda-app-about-language-block__edit-field-caption">
						<template v-if="fallbackDescription">
							<span
								:lang="fallbackDescription.lang.langCode"
								:dir="fallbackDescription.lang.langDir"
							>{{ fallbackDescription.lang.label }}</span>{{ i18n( 'colon-separator' ).text() }}
							{{ fallbackDescription.value }}
						</template>
					</div>
					<div class="ext-wikilambda-app-about-language-block__edit-field-counter">
						{{ descriptionCharsLeft }}
					</div>
				</template>
			</cdx-field>
			<!-- Aliases field -->
			<cdx-field
				class="ext-wikilambda-app-about-language-block__edit-field"
				data-testid="about-aliases-field"
			>
				<cdx-chip-input
					:input-chips="editData.aliases.value.map( ( v ) => ( { value: v } ) )"
					@update:input-chips="updateEditValue( editData.aliases, $event.map( ( v ) => v.value ) );
						changeEditValue();"
				></cdx-chip-input>
				<template #label>
					<span
						:lang="aliasesLabelData.langCode"
						:dir="aliasesLabelData.langDir"
					>{{ aliasesLabelData.label }}</span>
				</template>
				<template #help-text>
					<div
						v-if="fallbackAliases"
						class="ext-wikilambda-app-about-language-block__edit-field-caption"
					>
						<span
							:lang="fallbackAliases.lang.langCode"
							:dir="fallbackAliases.lang.langDir"
						>{{ fallbackAliases.lang.label }}</span>{{ i18n( 'colon-separator' ).text() }}
						{{ fallbackAliases.value.join( ', ' ) }}
					</div>
				</template>
			</cdx-field>
			<!-- Function input fields -->
			<template v-if="isFunction">
				<cdx-field
					v-for="( input, index ) in editData.inputs"
					:key="'input-' + index"
					class="ext-wikilambda-app-about-language-block__edit-field
						ext-wikilambda-app-about-language-block__edit-input"
					data-testid="about-input-field"
				>
					<cdx-text-input
						:model-value="input.value"
						:placeholder="i18n( 'wikilambda-function-definition-inputs-item-input-placeholder' ).text()"
						:maxlength="maxInputChars"
						data-testid="text-input"
						@update:model-value="updateEditValue( input, $event )"
						@change="changeEditValue"
					></cdx-text-input>
					<template #label>
						{{ i18n( 'wikilambda-about-widget-input-label', index + 1 ).text() }}
					</template>
					<template #help-text>
						<div class="ext-wikilambda-app-about-language-block__edit-field-caption">
							<template v-if="fallbackInputs[ index ]">
								<span
									:lang="fallbackInputs[ index ].lang.langCode"
									:dir="fallbackInputs[ index ].lang.langDir"
								>{{ fallbackInputs[ index ].lang.label }}</span>{{ i18n( 'colon-separator' ).text() }}
								{{ fallbackInputs[ index ].value }}
							</template>
						</div>
						<div class="ext-wikilambda-app-about-language-block__edit-field-counter">
							{{ inputCharsLeft[ index ] }}
						</div>
					</template>
				</cdx-field>
			</template>
		</div>
	</div>
</template>

<script>
const { computed, defineComponent, inject, ref } = require( 'vue' );

const Constants = require( '../../../Constants.js' );
const useMainStore = require( '../../../store/index.js' );
const { getZMonolingualItemForLang } = require( '../../../utils/zobjectUtils.js' );

// Type components
const ZObjectToString = require( '../../types/ZObjectToString.vue' );
// Codex components
const { CdxChipInput, CdxField, CdxInfoChip, CdxTextArea, CdxTextInput } = require( '../../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-about-language-block',
	components: {
		'cdx-chip-input': CdxChipInput,
		'cdx-field': CdxField,
		'cdx-info-chip': CdxInfoChip,
		'cdx-text-area': CdxTextArea,
		'cdx-text-input': CdxTextInput,
		'wl-z-object-to-string': ZObjectToString
	},
	props: {
		edit: {
			type: Boolean,
			required: true
		},
		language: {
			type: String,
			required: true
		},
		isFunction: {
			type: Boolean,
			required: true
		},
		viewData: {
			type: Object,
			required: true
		},
		editData: {
			type: Object,
			required: false,
			default: undefined
		},
		fieldLangs: {
			type: Object,
			required: true
		}
	},
	emits: [ 'change-value', 'update-edit-value' ],
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();

		const outputTypeKeyPath = [
			Constants.STORED_OBJECTS.MAIN,
			Constants.Z_PERSISTENTOBJECT_VALUE,
			Constants.Z_FUNCTION_RETURN_TYPE
		].join( '.' );
		const maxNameChars = Constants.LABEL_CHARS_MAX;
		const maxInputChars = Constants.INPUT_CHARS_MAX;
		const maxDescriptionChars = Constants.DESCRIPTION_CHARS_MAX;
		const seeAllAliases = ref( false );

		/**
		 * Returns the list of fallback languages in their Zid
		 * representation, excluding the language of the current block
		 *
		 * @return {Array}
		 */
		const fallbackLanguageZids = computed( () => store.getFallbackLanguageZids
			.filter( ( zid ) => zid !== props.language )
		);

		/**
		 * Returns the name for the closest available fallback language
		 *
		 * @return {Object|undefined}
		 */
		const fallbackName = computed( () => {
			// Don't search for fallback if the field has value
			if ( props.viewData.name.value ) {
				return undefined;
			}
			// Return the value in the first available fallback
			for ( const lang of fallbackLanguageZids.value ) {
				if ( props.fieldLangs.name.includes( lang ) ) {
					return {
						value: store.getZPersistentName( lang ).value,
						lang: store.getLabelData( lang )
					};
				}
			}
			// Or return undefined if no value was found
			return undefined;
		} );

		/**
		 * Returns the description for the closest available fallback language
		 *
		 * @return {Object|undefined}
		 */
		const fallbackDescription = computed( () => {
			// Don't search for fallback if the field has value
			if ( props.viewData.description.value ) {
				return undefined;
			}
			// Return the value in the first available fallback
			for ( const lang of fallbackLanguageZids.value ) {
				if ( props.fieldLangs.description.includes( lang ) ) {
					return {
						value: store.getZPersistentDescription( lang ).value,
						lang: store.getLabelData( lang )
					};
				}
			}
			// Or return undefined if no value was found
			return undefined;
		} );

		/**
		 * Returns the alias for the closest available fallback language
		 *
		 * @return {Object|undefined}
		 */
		const fallbackAliases = computed( () => {
			// Don't search for fallback if the field has value
			if ( props.viewData.aliases.value.length > 0 ) {
				return undefined;
			}
			// Return the value in the first available fallback
			for ( const lang of fallbackLanguageZids.value ) {
				if ( props.fieldLangs.aliases.includes( lang ) ) {
					return {
						value: store.getZPersistentAlias( lang ).value,
						lang: store.getLabelData( lang )
					};
				}
			}
			// Or return undefined if no value was found
			return undefined;
		} );

		/**
		 * Returns the function inputs for the fallback language
		 *
		 * @return {Array}
		 */
		const fallbackInputs = computed( () => props.viewData.inputs.map( ( input, index ) => {
			// Don't search for fallback if the field has value
			if ( input.value ) {
				return undefined;
			}
			// Return the value in the first available fallback
			for ( const lang of fallbackLanguageZids.value ) {
				if ( props.fieldLangs.inputs[ index ].includes( lang ) ) {
					const arg = store.getZFunctionInputs[ index ];
					const label = getZMonolingualItemForLang( arg[ Constants.Z_ARGUMENT_LABEL ], lang );
					return {
						value: label.value,
						lang: store.getLabelData( lang )
					};
				}
			}
			// Or return undefined if no value was found
			return undefined;
		} ) );

		/**
		 * Returns the label for the name input field (Z2K3)
		 *
		 * @return {LabelData}
		 */
		const nameLabelData = computed( () => store.getLabelData( Constants.Z_PERSISTENTOBJECT_LABEL ) );

		/**
		 * Returns the number of characters left to reach the
		 * label field maximum allowed.
		 *
		 * @return {number}
		 */
		const nameCharsLeft = computed( () => maxNameChars - props.editData.name.value.length );

		/**
		 * Returns whether the object has any available description
		 * (in any language)
		 *
		 * @return {boolean}
		 */
		const hasDescription = computed( () => !!props.viewData.description.value );

		/**
		 * Returns the label for the description input field (Z2K5)
		 *
		 * @return {LabelData}
		 */
		const descriptionLabelData = computed( () => store.getLabelData(
			Constants.Z_PERSISTENTOBJECT_DESCRIPTION
		) );

		/**
		 * Returns the number of characters left to reach the
		 * description field maximum allowed.
		 *
		 * @return {number}
		 */
		const descriptionCharsLeft = computed( () => maxDescriptionChars - props.editData.description.value.length );

		/**
		 * Returns whether the object has any available aliases
		 * (in any language)
		 *
		 * @return {boolean}
		 */
		const hasAliases = computed( () => props.viewData.aliases.value.length > 0 );

		/**
		 * Returns the label for the aliases input field (Z2K4)
		 *
		 * @return {LabelData}
		 */
		const aliasesLabelData = computed( () => store.getLabelData( Constants.Z_PERSISTENTOBJECT_ALIASES ) );

		/**
		 * Returns the visible aliases depending on
		 * the seeAllAliases flag.
		 *
		 * @return {Array}
		 */
		const visibleAliases = computed( () => ( seeAllAliases.value ?
			props.viewData.aliases.value :
			props.viewData.aliases.value.slice( 0, 3 ) ) );

		/**
		 * Returns the number of characters left to reach each
		 * input field maximum allowed.
		 *
		 * @return {Array}
		 */
		const inputCharsLeft = computed( () => props.editData.inputs
			.map( ( input ) => maxInputChars - input.value.length )
		);

		/**
		 * Returns the output type
		 *
		 * @return {Object|undefined}
		 */
		const outputType = computed( () => {
			if ( !props.isFunction ) {
				return undefined;
			}
			return store.getZFunctionOutput;
		} );

		/**
		 * Emits an 'update-edit-value' event with the changes done to
		 * the fields, so that the parent component can update the editData
		 * object passed as property.
		 *
		 * @param {Object} data
		 * @param {Array|string} value
		 */
		function updateEditValue( data, value ) {
			emit( 'update-edit-value', { data, value } );
		}

		/**
		 * Emits a 'change-value' event every time that a field
		 * changes its value, to trigger the parent to persist the new
		 * value into the state in case we are in an edit page.
		 * We use the 'change' events to limit state persistance to
		 * whole field updates (on blur, or on chip input), so that we
		 * don't run persistance methods for every input character.
		 */
		function changeEditValue() {
			emit( 'change-value' );
		}

		return {
			aliasesLabelData,
			changeEditValue,
			descriptionCharsLeft,
			descriptionLabelData,
			fallbackAliases,
			fallbackDescription,
			fallbackInputs,
			fallbackName,
			hasAliases,
			hasDescription,
			inputCharsLeft,
			maxDescriptionChars,
			maxInputChars,
			maxNameChars,
			nameCharsLeft,
			nameLabelData,
			outputType,
			outputTypeKeyPath,
			seeAllAliases,
			updateEditValue,
			visibleAliases,
			i18n
		};
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-about-language-block {
	.ext-wikilambda-app-about-language-block__unavailable {
		color: @color-placeholder;

		& > span {
			color: @color-base;
		}
	}

	.ext-wikilambda-app-about-language-block__description,
	.ext-wikilambda-app-about-language-block__aliases {
		overflow-wrap: break-word;
		margin-top: @spacing-50;
	}

	.ext-wikilambda-app-about-language-block__aliases {
		padding-bottom: @spacing-25;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.ext-wikilambda-app-about-language-block__aliases-more {
		color: @color-progressive;
	}

	.ext-wikilambda-app-about-language-block__function-fields {
		margin-top: @spacing-100;

		& > div {
			margin-top: @spacing-100;
		}
	}

	.ext-wikilambda-app-about-language-block__field-title {
		font-weight: @font-weight-bold;
	}

	.ext-wikilambda-app-about-language-block__field-value {
		margin-top: @spacing-25;
	}

	.ext-wikilambda-app-about-language-block__edit-field {
		margin: 0 0 @spacing-100;

		.cdx-field__help-text {
			display: flex;
			justify-content: space-between;
			align-items: baseline;
			flex-direction: row;
		}

		.cdx-text-area {
			max-width: initial;
		}

		.cdx-text-input {
			max-width: initial;
		}

		.cdx-chip-input__chips {
			min-width: auto;
		}

		.cdx-chip-input__input {
			max-width: 100%;
		}
	}

	.ext-wikilambda-app-about-language-block__edit-field-caption {
		display: block;
		color: @color-subtle;
		flex-grow: 1;
	}

	.ext-wikilambda-app-about-language-block__edit-field-counter {
		flex-grow: 0;
	}
}
</style>
