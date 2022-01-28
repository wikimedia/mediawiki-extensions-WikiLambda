<template>
	<div class="sd-input" :class="rootClasses">
		<label
			:id="labelElementId"
			:for="inputElementId"
			class="sd-input__label"
		>
			{{ label }}
		</label>

		<div
			:id="inputElementId"
			class="sd-input__active-box"
			tabindex="0"
			@click="onClick"
			@keyup.enter.prevent="onClick"
			@keyup="focusInput"
		>
			<span :class="{ 'sd-input__placeholder': !value }">{{ inputTitle }}</span>
			<span
				class="sd-input__indicator"
				role="button"
			>
				<sd-icon :icon="icons.sdIconExpand"></sd-icon>
			</span>
		</div>

		<sd-select-menu
			v-if="showLookupResults"
			:items="lookupResults"
			:active-item-index="activeLookupItemIndex"
			:listbox-id="lookupResultsElementId"
			:labelled-by="labelElementId"
			@select="onLookupItemSelect"
			@active-item-change="onActiveItemChange"
		>
			<div v-if="showSearchBox" class="sd-input__menu">
				<input
					ref="input"
					v-model="searchValue"
					dir="auto"
					class="sd-input__menu__input"
					type="text"
					role="combobox"
					autocomplete="off"
					aria-autocomplete="list"
					:aria-owns="lookupResultsElementId"
					:aria-expanded="isExpanded"
					:aria-activedescendant="activeLookupItemId"
					:placeholder="searchPlaceholder"
					@input="onInput"
					@keyup.enter="onSubmitActiveItem"
					@keyup.up="onArrowUp"
					@keyup.down="onArrowDown"
				>
				<span
					v-if="searchValue"
					class="sd-input__indicator"
					role="button"
					@click="onClear"
				>
					<sd-icon :icon="icons.sdIconClear" :title="clearTitle"></sd-icon>
				</span>
			</div>
		</sd-select-menu>
	</div>
</template>

<script>
var SdIcon = require( './Icon.vue' ),
	SdSelectMenu = require( './SelectMenu.vue' ),
	icons = require( './../../../lib/icons.js' );
/**
 * @file AutocompleteSearchInput
 *
 * Search input that emits user-provided input to the parent, then receives and
 * displays autocomplete results. This component is fairly specific to the Media
 * Search use case: we know we'll be fetching autocomplete results, we'll always
 * have a search icon and clear indicator button, etc. This could be made more
 * general for wider usage.
 */
// @vue/component
module.exports = {
	name: 'sd-autocomplete-search-input',
	components: {
		'sd-icon': SdIcon,
		'sd-select-menu': SdSelectMenu
	},
	props: {
		/**
		 * Name must be provided to ensure unique aria attributes. This probably
		 * isn't the best way to do it in WVUI but serves our purposes here.
		 */
		name: {
			type: String,
			required: true
		},
		/**
		 * Required label for input. Currently, label will always be visually
		 * hidden, but this could be toggled via a prop in a future iteration.
		 */
		label: {
			type: [ String, Object ],
			required: true
		},
		initialValue: {
			type: [ String, Number ],
			default: ''
		},
		placeholder: {
			type: [ String, Object ],
			default: null
		},
		clearTitle: {
			type: [ String, Object ],
			default: null
		},
		showSearchBox: {
			type: Boolean,
			default: true
		},
		searchPlaceholder: {
			type: String,
			default: null
		},
		lookupResults: {
			type: Array,
			default: function () {
				return [];
			}
		}
	},
	data: function () {
		return {
			searchValue: '',
			value: this.initialValue,
			icons: icons,
			pending: false,
			showLookupResults: false,
			activeLookupItemIndex: -1
		};
	},
	computed: {
		/**
		 * @return {string}
		 */
		inputTitle: function () {
			return this.value || this.placeholder;
		},
		/**
		 * @return {Object}
		 */
		rootClasses: function () {
			return {
				'sd-input--pending': this.pending
			};
		},
		/**
		 * @return {boolean}
		 */
		hasLookupResults: function () {
			return this.lookupResults.length > 0;
		},
		/**
		 * ID of the visually-hidden label.
		 *
		 * @return {string}
		 */
		labelElementId: function () {
			return this.name + '__label';
		},
		/**
		 * ID of the input.
		 *
		 * @return {string}
		 */
		inputElementId: function () {
			return this.name + '__input';
		},
		/**
		 * ID of the lookup results container.
		 *
		 * @return {string}
		 */
		lookupResultsElementId: function () {
			return this.name + '__lookup-results';
		},
		/**
		 * The ID of the element of the active lookup result item.
		 *
		 * @return {string|boolean}
		 */
		activeLookupItemId: function () {
			return this.activeLookupItemIndex > -1 ?
				this.lookupResultsElementId + '-item-' + this.activeLookupItemIndex :
				false;
		},
		/**
		 * For the aria-expanded attribute of the input, we need to use strings
		 * instead of booleans so that aria-expanded will be set to "false" when
		 * appropriate rather than the attribute being omitted, which is what
		 * would happen if we used a boolean false.
		 *
		 * @return {string}
		 */
		isExpanded: function () {
			return this.showLookupResults ? 'true' : 'false';
		},
		/**
		 * The actual string of the active lookup result item.
		 *
		 * @return {string}
		 */
		activeLookupItem: function () {
			if ( this.lookupResults.length < 1 ||
				!this.showLookupResults ||
				this.activeLookupItemIndex < 0
			) {
				return false;
			}
			return this.lookupResults[ this.activeLookupItemIndex ];
		}
	},
	methods: {
		/**
		 * Focus on input and set keyboard value as input value if valid input.
		 *
		 * @param {Event} event
		 * @fires keyup
		 */
		focusInput: function ( event ) {
			const keyCode = event.keyCode === 0 ? event.charCode : event.keyCode;
			const keyCodeIsNumber = keyCode >= 48 && keyCode <= 57;
			const keyCodeUpperCaseLetter = keyCode >= 65 && keyCode <= 90;
			const keyCodeLowerCaseLetter = keyCode >= 97 && keyCode <= 122;

			if ( keyCodeIsNumber || keyCodeUpperCaseLetter || keyCodeLowerCaseLetter ) {
				this.$refs.input.focus();
				this.$refs.input.value = event.key;
			}
		},
		/**
		 * Show/Hide lookup menu.
		 *
		 * @param {Event} event
		 * @fires click
		 */
		onClick: function ( event ) {
			this.toggleLookupResults( !this.showLookupResults );
			this.$emit( 'reset', event );
		},
		/**
		 * Emit input and enable pending state.
		 *
		 * @fires input
		 */
		onInput: function () {
			if ( this.searchValue === '' ) {
				return;
			}

			if ( this.hasLookupResults ) {
				this.clearLookupResults();
			}

			this.pending = true;
			this.$emit( 'input', this.searchValue );
		},
		/**
		 * Clear lookup result and emit reset.
		 *
		 * @param {Event} event
		 * @fires reset
		 */
		onReset: function ( event ) {
			this.clearLookupResults();
			this.$emit( 'reset', event );
		},
		/**
		 * Handle lookup item click.
		 *
		 * @param {number} index
		 * @fires submit
		 */
		onLookupItemSelect: function ( index ) {
			this.activeLookupItemIndex = index;
			this.onSubmitActiveItem();
		},
		/**
		 * Move to the next lookup result. If we're at the end, go back to the
		 * first item.
		 */
		onArrowDown: function () {
			var index = this.activeLookupItemIndex;
			if ( this.hasLookupResults ) {
				this.activeLookupItemIndex = this.lookupResults.length > index + 1 ?
					index + 1 :
					0;
			}
		},
		/**
		 * Move to the previous lookup result. If we're at the beginning, go to
		 * the last item.
		 */
		onArrowUp: function () {
			var index = this.activeLookupItemIndex;
			if ( this.hasLookupResults && index > -1 ) {
				this.activeLookupItemIndex = index === 0 ?
					this.lookupResults.length - 1 :
					index - 1;
			}
		},
		/**
		 * Change the active item index based on mouseover or mouseleave.
		 *
		 * @param {number} index
		 */
		onActiveItemChange: function ( index ) {
			this.activeLookupItemIndex = index;
		},
		/**
		 * Handle clear on icon click.
		 */
		onClear: function () {
			this.searchValue = '';
			this.$refs.input.focus();
		},
		/**
		 * Helper function to reset lookup results to an empty array.
		 */
		clearLookupResults: function () {
			this.$emit( 'clear-lookup-results' );
		},
		/**
		 * Show or hide lookup results.
		 *
		 * @param {boolean} show
		 */
		toggleLookupResults: function ( show ) {
			this.showLookupResults = show;
		},
		/**
		 * Handle enter keypress or button click.
		 *
		 * @fires enter
		 */
		onSubmitActiveItem: function () {
			// If the user is highlighting an autocomplete result, emit that
			// result. Otherwise, return.
			if ( !this.hasLookupResults || this.activeLookupItemIndex < 0 ) {
				return;
			}
			this.searchValue = '';
			this.value = this.activeLookupItem;
			this.$emit( 'submit', this.value );
			this.clearLookupResults();
			this.toggleLookupResults( false );
		}
	},
	watch: {
		/**
		 * When new lookup results are received, remove pending state and reset
		 * the active item index.
		 */
		lookupResults: function () {
			this.pending = false;
			this.activeLookupItemIndex = -1;
			this.toggleLookupResults( this.showLookupResults );
		},
		/**
		 * If the search term (passed down here as the "initial value" prop)
		 * changes for a reason besides the user typing into the input here
		 * (say, due to navigating forward/backward through history), make
		 * sure to update the value here to reflect the new term
		 *
		 * @param {string} newValue
		 */
		initialValue: function ( newValue ) {
			this.value = newValue;
		},
		/**
		 * Clear lookup results if the user manually deletes all characters
		 *
		 * @param {string} newValue
		 */
		searchValue: function ( newValue ) {
			if ( newValue === '' ) {
				this.onReset();
			}
		}
	}
};
</script>
