<template>
	<!--
		WikiLambda Vue component for setting the aliases of a ZFunction in the Function editor.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-function-definition-aliases">
		<div>
			<label for="ext-wikilambda-function-definition-aliases__input" class="ext-wikilambda-app__text-regular">
				{{ functionAliasLabel }}
			</label>
			<!-- TODO: replace href with correct URL: T298479 -->
			<a href="#" class="ext-wikilambda-app__text-smaller">
				{{ $i18n( 'wikilambda-function-definition-alias-example' ) }}
			</a>
		</div>

		<div class="ext-wikilambda-function-definition-aliases__inputs">
			<!-- TODO: Use chip component toa lign with designs T297271 -->
			<input
				v-for="alias in getCurrentLanguageAliases"
				:key="alias.id"
				:value="alias.value"
				:aria-label="$i18n( 'wikilambda-function-definition-alias-label' )"
				:placeholder="$i18n( 'wikilambda-function-definition-alias-placeholder' )"
				@input="updateAlias( alias.id, $event.target.value )"
			>
			<input
				:value="zobjectLabel"
				:aria-label="$i18n( 'wikilambda-function-definition-alias-label' )"
				:placeholder="$i18n( 'wikilambda-function-definition-alias-placeholder' )"
				@input="newAlias = $event.target.value"
			>
			<sd-button @click="addAliasForLanguage( getCurrentZLanguage )">
				+
			</sd-button>
		</div>
	</div>
</template>

<script>
var Constants = require( '../../../Constants.js' ),
	SdButton = require( '../../base/Button.vue' ),
	mapGetters = require( 'vuex' ).mapGetters,
	typeUtils = require( '../../../mixins/typeUtils.js' ),
	mapActions = require( 'vuex' ).mapActions;

// @vue/component
module.exports = {
	name: 'FunctionDefinitionAliases',
	components: {
		'sd-button': SdButton
	},
	mixins: [ typeUtils ],
	props: {
		zobjectId: {
			type: Number,
			default: 0
		}
	},
	computed: $.extend( mapGetters( [
		'getZObjectChildrenById',
		'getNestedZObjectById',
		'getNextObjectId',
		'getCurrentZLanguage'
	] ), {
		zobject: function () {
			return this.getZObjectChildrenById( this.zobjectId );
		},
		zObjectAliasId: function () {
			return this.findKeyInArray( Constants.Z_PERSISTENTOBJECT_ALIASES, this.zobject ).id;
		},
		getZObjectAliases: function () {
			return this.getZObjectChildrenById(
				this.getNestedZObjectById( this.zobjectId, [
					Constants.Z_PERSISTENTOBJECT_ALIASES,
					Constants.Z_MULTILINGUALSTRINGSET_VALUE
				] ).id );
		},
		getZObjectAliasObject: function () {
			return this.getZObjectChildrenById( this.getNestedZObjectById( this.zobjectId, [
				Constants.Z_PERSISTENTOBJECT_ALIASES,
				Constants.Z_MULTILINGUALSTRINGSET_VALUE
			] ).id ).map( function ( alias ) {
				return this.getZObjectChildrenById( alias.id );
			}.bind( this ) );
		},
		getCurrentLanguageAliases: function () {
			for ( var index in this.getZObjectAliasObject ) {
				var alias = this.getZObjectAliasObject[ index ],
					language = this.getNestedZObjectById(
						this.findKeyInArray( Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE, alias ).id, [
							Constants.Z_REFERENCE_ID
						] );

				if ( language.value === this.getCurrentZLanguage ) {
					return this.getZObjectChildrenById(
						this.findKeyInArray( Constants.Z_MONOLINGUALSTRINGSET_VALUE, alias ).id
					).map( function ( aliasString ) {
						return this.getNestedZObjectById( aliasString.id, [
							Constants.Z_STRING_VALUE
						] );
					}.bind( this ) );
				}
			}

			return false;
		},
		functionAliasLabel: function () {
			return this.$i18n( 'wikilambda-function-definition-alias-label' ) + ' ( ' + this.$i18n( 'wikilambda-optional' ) + ' )';
		}
	} ),
	methods: $.extend( mapActions( [
		'setZObjectValue',
		'addZObject',
		'addZString',
		'injectZObject',
		'removeZObjectChildren',
		'removeZObject'
	] ), {

		getLanguageAliasStringsetId: function ( language ) {
			var aliasId;

			this.getZObjectAliases.forEach( function ( alias ) {
				var aliasLang = this.getNestedZObjectById( alias.id, [
					Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE,
					Constants.Z_REFERENCE_ID
				] );

				if ( aliasLang.value === language ) {
					aliasId = this.getNestedZObjectById( alias.id, [
						Constants.Z_MONOLINGUALSTRINGSET_VALUE
					] ).id;
				}
			}.bind( this ) );

			return aliasId;
		},
		getLanguageAliases: function ( language ) {
			return this.getZObjectChildrenById( this.getLanguageAliasStringsetId( language ) ).map( function ( alias ) {
				return alias.id;
			} );
		},
		addAliasForLanguage: function ( language ) {
			var existingAliasId = this.getLanguageAliasStringsetId( language ),
				nextId = this.getNextObjectId,
				payload;

			if ( existingAliasId ) {
				payload = {
					key: this.getLanguageAliases( language ).length,
					value: 'object',
					parent: existingAliasId
				};

				this.addZObject( payload );
				this.addZString( {
					id: nextId,
					value: this.newAlias
				} );
			} else {
				var key = this.getZObjectAliases.length.toString();
				payload = {
					key: key,
					value: 'object',
					parent: this.getNestedZObjectById( this.zObjectAliasId, [
						Constants.Z_MULTILINGUALSTRINGSET_VALUE
					] ).id
				};

				this.addZObject( payload );
				this.injectZObject( {
					zobject: {
						Z1K1: Constants.Z_MONOLINGUALSTRINGSET,
						Z31K1: language,
						Z31K2: [
							this.newAlias
						]
					},
					key: key,
					id: nextId,
					parent: this.getNestedZObjectById( this.zObjectAliasId, [
						Constants.Z_MULTILINGUALSTRINGSET_VALUE
					] ).id
				} );
			}

			this.newAlias = '';
		},
		updateAlias: function ( aliasId, value ) {
			var payload = {
				id: aliasId,
				value: value
			};

			this.setZObjectValue( payload );
		},
		removeAlias: function ( alias ) {
			this.removeZObjectChildren( alias );
			this.removeZObject( alias );
		}
	} )
};
</script>

<style lang="less">
@import '../../../ext.wikilambda.edit.less';

.ext-wikilambda-function-definition-aliases {
	display: flex;
	margin-bottom: 26px;

	& > div {
		display: flex;
		flex-direction: column;
		width: 153px;
	}

	&__inputs {
		width: 300px;
		display: flex;
		flex-direction: column;
	}

	input {
		width: 300px;
		height: 20px;
		padding: 4px 6px;
		margin-bottom: 6px;
	}
}
</style>
