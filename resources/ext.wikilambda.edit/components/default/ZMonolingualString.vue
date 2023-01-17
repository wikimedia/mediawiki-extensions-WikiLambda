<template>
	<!--
		WikiLambda Vue component for Z11/Monolingual String objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-monolingual-string">
		<div v-if="!edit">
			<p><span class="ext-wikilambda-lang-chip">{{ langIso }}</span> {{ text }}</p>
		</div>
		<div v-else :class="inputContainerClass">
			<span class="ext-wikilambda-lang-chip">{{ langIso }}</span>
			<input
				v-model="text"
				type="text"
				class="ext-wikilambda-monolingual-string__input"
				@focus="setIsInputActive( true )"
				@focusout="setIsInputActive( false )">
		</div>
	</div>
</template>

<script>
var
	Constants = require( '../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'z-monolingual-string',
	props: {
		rowId: {
			type: Number,
			required: false,
			default: 0
		},
		edit: {
			type: Boolean,
			required: true
		}
	},
	data: function () {
		return {
			isInputActive: false
		};
	},
	computed: $.extend(
		mapGetters( [
			'getLabel',
			'getZMonolingualTextValue',
			'getZMonolingualLangValue'
		] ),
		{
			/**
			 * Computed value:
			 * 1. Getter gets the value from the state.
			 * 2. Setter informs the ZObjectKeyValue of the change.
			 * Only the ZObjectKeyValue responds to the 'setValue' emitted event
			 * so only the ZObjectKeyValue is doing operations to transform
			 * the state data. This is so that we don't duplicate state mutation
			 * logic all over the components, and builtin components are just
			 * visual representations and have zero logic.
			 */
			text: {
				/**
				 * Returns the terminal value of the string represented
				 * in this component.
				 *
				 * @return {string}
				 */
				get: function () {
					return this.getZMonolingualTextValue( this.rowId );
				},
				/**
				 * Emits a setValue event with the new value for the string
				 * and the key path information depending on the object key.
				 *
				 * @param {string} value
				 */
				set: function ( value ) {
					this.$emit( 'set-value', {
						keyPath: [
							Constants.Z_MONOLINGUALSTRING_VALUE,
							Constants.Z_STRING_VALUE
						],
						value
					} );
				}
			},

			/**
			 * Returns the language Zid of the Monolingual string
			 * object represented in this component.
			 * FIXME This assumes that the language is a reference,
			 * but it could be a literal. We should fix this logic
			 * for that case.
			 *
			 * @return {string}
			 */
			lang: function () {
				return this.getZMonolingualLangValue( this.rowId );
			},

			/**
			 * Returns the object { label, lang, zid } with the linguistic
			 * information of the language zid or undefined if the zid
			 * doesn't exist or wasn't found.
			 * TODO: Create Label class or interface
			 *
			 * @return {Object|undefined}
			 */
			langLabelObj: function () {
				return this.getLabel( this.lang );
			},

			/**
			 * Return the text that identifies the language in which
			 * this Monolingual String is written.
			 * TODO: Currently returns language label, but must return ISO code
			 *
			 * @return {string}
			 */
			langIso: function () {
				return this.langLabelObj ? this.langLabelObj.label : this.lang;
			},

			inputContainerClass: function () {
				return {
					'ext-wikilambda-monolingual-string__edit-mode': true,
					'ext-wikilambda-monolingual-string__edit-mode-active': this.isInputActive
				};
			}
		}
	),
	methods: {
		setIsInputActive: function ( isActive ) {
			this.isInputActive = isActive;
		}
	}
};

</script>

<style lang="less">
@import './../../../lib/wikimedia-ui-base.less';

.ext-wikilambda-monolingual-string {
	p {
		margin: 0;
		color: @color-base;
	}

	span.ext-wikilambda-lang-chip {
		margin-right: 5px;
		margin-top: 3px;
		margin-bottom: 3px;
		font-size: 0.8em;
		border: 1px solid @wmui-color-base50;
		padding: 2px 5px;
		border-radius: 100px;
		text-transform: uppercase;
	}

	&__edit-mode {
		display: flex;
		flex: 1 auto;
		flex-wrap: nowrap;
		border-radius: 2px;
		padding: 0 8px;
		border-width: 1px;
		border-style: solid;
		border-color: @wmui-color-base50;
		box-shadow: inset 0 0 0 1px transparent;
		max-width: 15%;
		min-width: 220px;
	}

	&__edit-mode-active {
		max-width: 100%;

		@media screen and ( min-width: @width-breakpoint-tablet ) {
			max-width: 50%;
		}
	}

	&__input {
		flex-grow: inherit;
		height: 26px;
		padding: 2px 0;
		border: 0;
		outline: 0;
		font-family: inherit;
		font-size: inherit;
		line-height: 1.43em;
	}
}

</style>
