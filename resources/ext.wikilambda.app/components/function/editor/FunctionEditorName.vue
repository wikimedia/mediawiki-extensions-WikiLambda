<!--
	WikiLambda Vue component for setting the name of a ZFunction in the Function editor.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<wl-function-editor-field class="ext-wikilambda-app-function-editor-name">
		<template #label>
			<label :for="nameFieldId">
				{{ nameLabel }}
				<span>{{ nameOptional }}</span>
			</label>
		</template>
		<template #body>
			<cdx-text-input
				:id="nameFieldId"
				:lang="name ? langLabelData.langCode : undefined"
				:dir="name ? langLabelData.langDir : undefined"
				:model-value="name ? name.value : ''"
				class="ext-wikilambda-app-function-editor-name__input"
				:aria-label="nameLabel"
				:placeholder="nameFieldPlaceholder"
				:maxlength="maxLabelChars"
				@input="updateRemainingChars"
				@change="persistName"
			></cdx-text-input>
			<div class="ext-wikilambda-app-function-editor-name__counter">
				{{ remainingChars }}
			</div>
		</template>
	</wl-function-editor-field>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapActions, mapState } = require( 'pinia' );

const Constants = require( '../../../Constants.js' );
const useMainStore = require( '../../../store/index.js' );
const LabelData = require( '../../../store/classes/LabelData.js' );
const pageTitleMixin = require( '../../../mixins/pageTitleMixin.js' );

// Function editor components
const FunctionEditorField = require( './FunctionEditorField.vue' );
// Codex components
const { CdxTextInput } = require( '../../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-function-editor-name',
	components: {
		'wl-function-editor-field': FunctionEditorField,
		'cdx-text-input': CdxTextInput
	},
	mixins: [ pageTitleMixin ],
	props: {
		/**
		 * zID of item label language
		 *
		 * @example Z1014
		 */
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
			maxLabelChars: Constants.LABEL_CHARS_MAX,
			remainingChars: Constants.LABEL_CHARS_MAX
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getZPersistentName'
	] ), {
		/**
		 * Finds the Name (Z2K3) for the given language and returns
		 * its keyPath and value if found. Else, returns undefined.
		 *
		 * @return {Object|undefined}
		 */
		name: function () {
			return this.zLanguage ? this.getZPersistentName( this.zLanguage ) : undefined;
		},
		/**
		 * Returns the label for the name field
		 *
		 * @return {string}
		 */
		nameLabel: function () {
			// TODO (T335583): Replace i18n message with key label
			// return this.getLabelData( Constants.Z_PERSISTENTOBJECT_LABEL );
			return this.$i18n( 'wikilambda-function-definition-name-label' ).text();
		},
		/**
		 * Returns the i18n message for the name field placeholder
		 *
		 * @return {string}
		 */
		nameFieldPlaceholder: function () {
			return this.$i18n( 'wikilambda-function-definition-name-placeholder' ).text();
		},
		/**
		 * Returns the "optional" caption for the name field
		 *
		 * @return {string}
		 */
		nameOptional: function () {
			return this.$i18n( 'parentheses', [ this.$i18n( 'wikilambda-optional' ).text() ] ).text();
		},
		/**
		 * Returns the id for the input field
		 *
		 * @return {string}
		 */
		nameFieldId: function () {
			return `ext-wikilambda-app-function-editor-name__input-${ this.zLanguage }`;
		}
	} ),
	methods: Object.assign( {}, mapActions( useMainStore, [
		'setZMonolingualString'
	] ), {
		/**
		 * Updates the remainingChars data property as the user types into the Z2K5 field
		 *
		 * @param {Event} event - the event object that is automatically passed in on input
		 */
		updateRemainingChars: function ( event ) {
			const { length } = event.target.value;
			this.remainingChars = this.maxLabelChars - length;
		},
		/**
		 * Persist the new name value in the globally stored object
		 *
		 * @param {Object} event
		 */
		persistName: function ( event ) {
			if ( this.ignoreChangeEvent ) {
				return;
			}

			this.setZMonolingualString( {
				parentKeyPath: [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_LABEL,
					Constants.Z_MULTILINGUALSTRING_VALUE
				],
				itemKeyPath: this.name ? this.name.keyPath : undefined,
				value: event.target.value,
				lang: this.zLanguage
			} );

			// After persisting in the state, update the page title
			this.updatePageTitle();
			this.$emit( 'name-updated' );
		}
	} ),
	mounted: function () {
		this.$nextTick( function () {
			this.remainingChars = this.maxLabelChars - ( this.name ? this.name.value.length : 0 );
		} );
	},
	beforeUnmount: function () {
		// When the component is unmounted, we want to ignore any change events and not persist the data
		this.ignoreChangeEvent = true;
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-function-editor-name {
	.ext-wikilambda-app-function-editor-name__counter {
		color: @color-subtle;
		margin-left: @spacing-50;
		display: flex;
		justify-content: flex-end;
	}
}
</style>
