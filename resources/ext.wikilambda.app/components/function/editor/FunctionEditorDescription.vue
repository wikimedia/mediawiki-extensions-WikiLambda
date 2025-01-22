<!--
	WikiLambda Vue component for setting the description of a ZFunction in the Function editor.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<wl-function-editor-field class="ext-wikilambda-app-function-editor-description">
		<template #label>
			<label :for="descriptionInputId">
				{{ descriptionLabel }}
				<span>{{ descriptionOptional }}</span>
			</label>
		</template>
		<template #body>
			<cdx-text-area
				:id="descriptionInputId"
				:lang="description ? langLabelData.langCode : undefined"
				:dir="description ? langLabelData.langDir : undefined"
				:model-value="description"
				class="ext-wikilambda-app-function-editor-description__input"
				:aria-label="descriptionLabel"
				:placeholder="descriptionInputPlaceholder"
				:maxlength="maxDescriptionChars"
				@input="updateRemainingChars"
				@change="persistDescription"
			></cdx-text-area>
			<div class="ext-wikilambda-app-function-editor-description__counter">
				{{ remainingChars }}
			</div>
		</template>
	</wl-function-editor-field>
</template>

<script>

const { CdxTextArea } = require( '@wikimedia/codex' );
const { defineComponent } = require( 'vue' );
const Constants = require( '../../../Constants.js' ),
	LabelData = require( '../../../store/classes/LabelData.js' ),
	FunctionEditorField = require( './FunctionEditorField.vue' ),
	{ mapActions, mapGetters } = require( 'vuex' );

module.exports = exports = defineComponent( {
	name: 'wl-function-editor-description',
	components: {
		'wl-function-editor-field': FunctionEditorField,
		'cdx-text-area': CdxTextArea
	},
	props: {
		zLanguage: {
			type: String,
			required: true
		},
		/**
		 * Label data for the language
		 */
		langLabelData: {
			type: LabelData,
			default: null
		}
	},
	data: function () {
		return {
			ignoreChangeEvent: false,
			maxDescriptionChars: Constants.DESCRIPTION_CHARS_MAX,
			remainingChars: Constants.DESCRIPTION_CHARS_MAX
		};
	},
	computed: Object.assign( mapGetters( [
		'getRowByKeyPath',
		'getZMonolingualTextValue',
		'getZPersistentDescription'
	] ), {
		/**
		 * Returns the Short Description (Z2K5) row for the
		 * appropriate language
		 *
		 * @return {Object|undefined}
		 */
		descriptionRow: function () {
			return this.zLanguage ?
				this.getZPersistentDescription( this.zLanguage ) :
				undefined;
		},
		/**
		 * Returns true if the current zObject has a description object
		 *
		 * @return {boolean}
		 */
		hasDescription: function () {
			return this.descriptionRow !== undefined;
		},
		/**
		 * Returns the description value for the given language.
		 * If value is not available, returns empty string
		 *
		 * @return {string}
		 */
		description: function () {
			return this.hasDescription ?
				this.getZMonolingualTextValue( this.descriptionRow.id ) :
				'';
		},
		/**
		 * Returns the label for the description field
		 *
		 * @return {string}
		 */
		descriptionLabel: function () {
			// TODO (T335583): Replace i18n message with key label
			// return this.getLabelData( Constants.Z_PERSISTENTOBJECT_DESCRIPTION );
			return this.$i18n( 'wikilambda-function-definition-description-label' ).text();
		},
		/**
		 * Returns the i18n message for the description field placeholder
		 *
		 * @return {string}
		 */
		descriptionInputPlaceholder: function () {
			return this.$i18n( 'wikilambda-function-definition-description-placeholder' ).text();
		},
		/**
		 * Returns the "optional" caption for the description field
		 *
		 * @return {string}
		 */
		descriptionOptional: function () {
			return this.$i18n( 'parentheses', [ this.$i18n( 'wikilambda-optional' ).text() ] ).text();
		},
		/**
		 * Returns the id for the input field
		 *
		 * @return {string}
		 */
		descriptionInputId: function () {
			return `ext-wikilambda-app-function-editor-description__input${ this.zLanguage }`;
		}
	} ),
	methods: Object.assign( mapActions( [
		'changeType',
		'removeItemFromTypedList',
		'setValueByRowIdAndPath'
	] ), {
		/**
		 * Updates the remainingChars data property as the user types into the Z2K5 field
		 *
		 * @param {Event} event - the event object that is automatically passed in on input
		 */
		updateRemainingChars: function ( event ) {
			const { length } = event.target.value;
			this.remainingChars = this.maxDescriptionChars - length;
		},
		/**
		 * Persist the new name value in the globally stored object
		 *
		 * @param {Object} event
		 */
		persistDescription: function ( event ) {
			if ( this.ignoreChangeEvent ) {
				return;
			}

			const value = event.target.value;

			if ( this.hasDescription ) {
				if ( value === '' ) {
					this.removeItemFromTypedList( { rowId: this.descriptionRow.id } );
				} else {
					this.setValueByRowIdAndPath( {
						rowId: this.descriptionRow.id,
						keyPath: [
							Constants.Z_MONOLINGUALSTRING_VALUE,
							Constants.Z_STRING_VALUE
						],
						value
					} );
				}
			} else {
				// If this.descriptionRow is undefined, there's no monolingual string
				// for the given language, so we create a new monolingual string
				// with the new value and append to the parent list.
				const parentRow = this.getRowByKeyPath( [
					Constants.Z_PERSISTENTOBJECT_DESCRIPTION,
					Constants.Z_MULTILINGUALSTRING_VALUE
				] );
				if ( !parentRow ) {
					// This should never happen because all Z2Kn's are initialized
					return;
				}
				this.changeType( {
					id: parentRow.id,
					type: Constants.Z_MONOLINGUALSTRING,
					lang: this.zLanguage,
					value,
					append: true
				} );
			}
			this.$emit( 'description-updated' );
		}
	} ),
	mounted: function () {
		this.$nextTick( function () {
			this.remainingChars = this.maxDescriptionChars - this.description.length;
		} );
	},
	beforeUnmount() {
		// When the component is unmounted, we want to ignore any change events and not persist the data
		this.ignoreChangeEvent = true;
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-function-editor-description {
	.ext-wikilambda-app-function-editor-description__counter {
		color: @color-subtle;
		margin-left: @spacing-50;
		display: flex;
		justify-content: flex-end;
	}
}
</style>
