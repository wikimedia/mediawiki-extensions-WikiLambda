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
					{{ $i18n( 'wikilambda-about-widget-no-descriptions-or-aliases' ).text() }}
				</div>
				<template v-else>
					<!-- Description block -->
					<div class="ext-wikilambda-app-about-language-block__description" data-testid="about-description">
						<span v-if="hasDescription" class="ext-wikilambda-app-about-language-block__value">
							{{ viewData.description.value }}
						</span>
						<span v-else class="ext-wikilambda-app-about-language-block__unavailable">
							{{ $i18n( 'wikilambda-about-widget-no-descriptions' ).text() }}
						</span>
					</div>
					<!-- Aliases block -->
					<div class="ext-wikilambda-app-about-language-block__aliases" data-testid="about-aliases">
						<template v-if="hasAliases">
							<span
								v-for="( alias, index ) in visibleAliases"
								:key="'alias-' + index"
								class="ext-wikilambda-app-about-language-block__alias"
								data-testid="about-alias"
							>{{ alias.value }}</span>
							<a
								v-if="viewData.aliases.value.length > 3 && !seeAllAliases"
								class="ext-wikilambda-app-about-language-block__aliases-more"
								@click="seeAllAliases = true"
							>+{{ viewData.aliases.value.length - 3 }}</a>
						</template>
						<span v-else class="ext-wikilambda-app-about-language-block__unavailable">
							{{ $i18n( 'wikilambda-about-widget-no-aliases' ).text() }}
						</span>
					</div>
				</template>
			</div>
			<!-- Function specific fields -->
			<div v-if="isFunction" class="ext-wikilambda-app-about-language-block__function-fields">
				<div class="ext-wikilambda-app-about-language-block__inputs">
					<!-- Inputs -->
					<div class="ext-wikilambda-app-about-language-block__field-title">
						{{ $i18n( 'wikilambda-function-definition-inputs-label' ).text() }}
					</div>
					<template v-if="viewData.inputs.length > 0">
						<div
							v-for="input in viewData.inputs"
							:key="input.key"
							class="ext-wikilambda-app-about-language-block__field-value
								ext-wikilambda-app-about-language-block__input">
							<!-- eslint-disable-next-line max-len -->
							<span
								v-if="input.value"
								class="ext-wikilambda-app-about-language-block__input-label"
							>{{ input.value }}<span>{{ $i18n( 'colon-separator' ).text() }}</span>
							</span>
							<span
								v-else
								class="ext-wikilambda-app-about-language-block__input-label
									ext-wikilambda-app-about-language-block__unavailable"
							><!-- eslint-disable-line max-len -->{{ $i18n( 'wikilambda-editor-default-name' ).text() }}<span>{{ $i18n( 'colon-separator' ).text() }}&nbsp;</span>
							</span><wl-z-object-to-string :row-id="input.typeRowId"></wl-z-object-to-string>
						</div>
					</template>
					<div v-else class="ext-wikilambda-app-about-language-block__field-value">
						<span class="ext-wikilambda-app-about-language-block__unavailable">
							{{ $i18n( 'wikilambda-about-widget-no-inputs' ).text() }}
						</span>
					</div>
				</div>
				<!-- Output -->
				<div class="ext-wikilambda-app-about-language-block__output">
					<div class="ext-wikilambda-app-about-language-block__field-title">
						{{ $i18n( 'wikilambda-function-definition-output-label' ).text() }}
					</div>
					<div class="ext-wikilambda-app-about-language-block__field-value">
						<wl-z-object-to-string :row-id="outputTypeRowId"></wl-z-object-to-string>
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
					:placeholder="$i18n( 'wikilambda-about-widget-name-placeholder' ).text()"
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
							>{{ fallbackName.lang.label }}</span>{{ $i18n( 'colon-separator' ).text() }}
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
					:placeholder="$i18n( 'wikilambda-about-widget-description-placeholder' ).text()"
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
							>{{ fallbackDescription.lang.label }}</span>{{ $i18n( 'colon-separator' ).text() }}
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
					:input-chips="editData.aliases.value"
					@update:input-chips="updateEditValue( editData.aliases, $event );
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
						>{{ fallbackAliases.lang.label }}</span>{{ $i18n( 'colon-separator' ).text() }}
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
						:placeholder="$i18n( 'wikilambda-function-definition-inputs-item-input-placeholder' ).text()"
						:maxlength="maxInputChars"
						data-testid="text-input"
						@update:model-value="updateEditValue( input, $event )"
						@change="changeEditValue"
					></cdx-text-input>
					<template #label>
						{{ $i18n( 'wikilambda-about-widget-input-label', index + 1 ).text() }}
					</template>
					<template #help-text>
						<div class="ext-wikilambda-app-about-language-block__edit-field-caption">
							<template v-if="fallbackInputs[ index ]">
								<span
									:lang="fallbackInputs[ index ].lang.langCode"
									:dir="fallbackInputs[ index ].lang.langDir"
								>{{ fallbackInputs[ index ].lang.label }}</span>{{ $i18n( 'colon-separator' ).text() }}
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
const { defineComponent } = require( 'vue' );
const { mapState } = require( 'pinia' );
const { CdxChipInput, CdxField, CdxTextArea, CdxTextInput } = require( '../../../../codex.js' );
const Constants = require( '../../../Constants.js' );
const useMainStore = require( '../../../store/index.js' );
const ZObjectToString = require( '../../default-view-types/ZObjectToString.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-about-language-block',
	components: {
		'cdx-chip-input': CdxChipInput,
		'cdx-field': CdxField,
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
	data: function () {
		return {
			maxNameChars: Constants.LABEL_CHARS_MAX,
			maxInputChars: Constants.INPUT_CHARS_MAX,
			maxDescriptionChars: Constants.DESCRIPTION_CHARS_MAX,
			seeAllAliases: false
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getFallbackLanguageZids',
		'getLabelData',
		'getZArgumentLabelForLanguage',
		'getZFunctionOutput',
		'getZMonolingualTextValue',
		'getZMonolingualStringsetValues',
		'getZPersistentName',
		'getZPersistentAlias',
		'getZPersistentDescription'
	] ), {
		/**
		 * Returns the list of fallback languages in their Zid
		 * representation, excluding the language of the current block
		 *
		 * @return {Array}
		 */
		fallbackLanguageZids: function () {
			return this.getFallbackLanguageZids.filter( ( zid ) => zid !== this.language );
		},
		/**
		 * Returns the name for the closest available fallback language
		 *
		 * @return {Object|undefined}
		 */
		fallbackName: function () {
			// Don't search for fallback if the field has value
			if ( this.viewData.name.value ) {
				return undefined;
			}
			// Return the value in the first available fallback
			for ( const lang of this.fallbackLanguageZids ) {
				if ( this.fieldLangs.name.includes( lang ) ) {
					const row = this.getZPersistentName( lang );
					return {
						value: this.getZMonolingualTextValue( row.id ),
						lang: this.getLabelData( lang )
					};
				}
			}
			// Or return undefined if no value was found
			return undefined;
		},
		/**
		 * Returns the description for the closest available fallback language
		 *
		 * @return {Object|undefined}
		 */
		fallbackDescription: function () {
			// Don't search for fallback if the field has value
			if ( this.viewData.description.value ) {
				return undefined;
			}
			// Return the value in the first available fallback
			for ( const lang of this.fallbackLanguageZids ) {
				if ( this.fieldLangs.description.includes( lang ) ) {
					const row = this.getZPersistentDescription( lang );
					return {
						value: this.getZMonolingualTextValue( row.id ),
						lang: this.getLabelData( lang )
					};
				}
			}
			// Or return undefined if no value was found
			return undefined;
		},
		/**
		 * Returns the alias for the closest available fallback language
		 *
		 * @return {Object|undefined}
		 */
		fallbackAliases: function () {
			// Don't search for fallback if the field has value
			if ( this.viewData.aliases.value.length > 0 ) {
				return undefined;
			}
			// Return the value in the first available fallback
			for ( const lang of this.fallbackLanguageZids ) {
				if ( this.fieldLangs.aliases.includes( lang ) ) {
					const row = this.getZPersistentAlias( lang );
					return {
						value: this.getZMonolingualStringsetValues( row.id ).map( ( item ) => item.value ),
						lang: this.getLabelData( lang )
					};
				}
			}
			// Or return undefined if no value was found
			return undefined;
		},
		/**
		 * Returns the function inputs for the fallback language
		 *
		 * @return {Array}
		 */
		fallbackInputs: function () {
			return this.viewData.inputs.map( ( input, index ) => {
				// Don't search for fallback if the field has value
				if ( input.value ) {
					return undefined;
				}
				// Return the value in the first available fallback
				for ( const lang of this.fallbackLanguageZids ) {
					if ( this.fieldLangs.inputs[ index ].includes( lang ) ) {
						const row = this.getZArgumentLabelForLanguage( input.inputRowId, lang );
						return {
							value: this.getZMonolingualTextValue( row.id ),
							lang: this.getLabelData( lang )
						};
					}
				}
				// Or return undefined if no value was found
				return undefined;
			} );
		},
		/**
		 * Returns the label for the name input field (Z2K3)
		 *
		 * @return {LabelData}
		 */
		nameLabelData: function () {
			return this.getLabelData( Constants.Z_PERSISTENTOBJECT_LABEL );
		},
		/**
		 * Returns the number of characters left to reach the
		 * label field maximum allowed.
		 *
		 * @return {number}
		 */
		nameCharsLeft: function () {
			return this.maxNameChars - this.editData.name.value.length;
		},
		/**
		 * Returns whether the object has any available description
		 * (in any language)
		 *
		 * @return {boolean}
		 */
		hasDescription: function () {
			return !!this.viewData.description.value;
		},
		/**
		 * Returns the label for the description input field (Z2K5)
		 *
		 * @return {LabelData}
		 */
		descriptionLabelData: function () {
			return this.getLabelData( Constants.Z_PERSISTENTOBJECT_DESCRIPTION );
		},
		/**
		 * Returns the number of characters left to reach the
		 * description field maximum allowed.
		 *
		 * @return {number}
		 */
		descriptionCharsLeft: function () {
			return this.maxDescriptionChars - this.editData.description.value.length;
		},
		/**
		 * Returns whether the object has any available aliases
		 * (in any language)
		 *
		 * @return {boolean}
		 */
		hasAliases: function () {
			return this.viewData.aliases.value.length > 0;
		},
		/**
		 * Returns the label for the aliases input field (Z2K4)
		 *
		 * @return {LabelData}
		 */
		aliasesLabelData: function () {
			return this.getLabelData( Constants.Z_PERSISTENTOBJECT_ALIASES );
		},
		/**
		 * Returns the visible aliases depending on
		 * the seeAllAliases flag.
		 *
		 * @return {Array}
		 */
		visibleAliases: function () {
			return this.seeAllAliases ?
				this.viewData.aliases.value :
				this.viewData.aliases.value.slice( 0, 3 );
		},
		/**
		 * Returns the number of characters left to reach each
		 * input field maximum allowed.
		 *
		 * @return {Array}
		 */
		inputCharsLeft: function () {
			return this.editData.inputs.map( ( input ) => this.maxInputChars - input.value.length );
		},
		/**
		 * Returns the rowId of the output type
		 *
		 * @return {number|undefined}
		 */
		outputTypeRowId: function () {
			if ( !this.isFunction ) {
				return undefined;
			}
			const outputTypeRow = this.getZFunctionOutput();
			return outputTypeRow ? outputTypeRow.id : undefined;
		}
	} ),
	methods: {
		/**
		 * Emits an 'update-edit-value' event with the changes done to
		 * the fields, so that the parent component can update the editData
		 * object passed as property.
		 *
		 * @param {Object} data
		 * @param {Array|string} value
		 */
		updateEditValue: function ( data, value ) {
			this.$emit( 'update-edit-value', { data, value } );
		},
		/**
		 * Emits a 'change-value' event every time that a field
		 * changes its value, to trigger the parent to persist the new
		 * value into the state in case we are in an edit page.
		 * We use the 'change' events to limit state persistance to
		 * whole field updates (on blur, or on chip input), so that we
		 * don't run persistance methods for every input character.
		 */
		changeEditValue: function () {
			this.$emit( 'change-value' );
		}
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

	.ext-wikilambda-app-about-language-block__alias {
		display: inline-block;
		border-radius: @border-radius-pill;
		border: 1px solid @border-color-subtle;
		color: @color-subtle;
		padding: 0 @spacing-50;
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
